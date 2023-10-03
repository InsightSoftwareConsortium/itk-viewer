import { ReadonlyMat4, mat4 } from 'gl-matrix';
import { ActorRefFrom, assign, createMachine, raise, sendTo } from 'xstate';
import type { Image } from '@itk-wasm/htj2k';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { fpsWatcher } from '@itk-viewer/viewer/fps-watcher-machine.js';
import { viewportMachine } from '@itk-viewer/viewer/viewport-machine.js';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

type RendererProps = {
  density: number;
  cameraPose: ReadonlyMat4;
  image?: string;
  imageScale?: number;
};

// https://stackoverflow.com/a/74823834
type Entries<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T][];

const getEntries = <T extends object>(obj: T) =>
  Object.entries(obj) as Entries<T>;

// example: [['density', 30], ['cameraPose', mat4.create()]]
export type RendererEntries = Entries<RendererProps>;

export type Context = {
  serverConfig?: unknown;
  server?: unknown;
  frame?: Image;
  rendererProps: RendererProps;
  queuedRendererEvents: RendererEntries;
  stagedRendererEvents: RendererEntries;
  viewport: ActorRefFrom<typeof viewportMachine>;
  toRendererCoordinateSystem: ReadonlyMat4;
};

type ConnectEvent = {
  type: 'connect';
  config: unknown;
};

type UpdateRendererEvent = {
  type: 'updateRenderer';
  props: Partial<RendererProps>;
};

type RenderEvent = {
  type: 'render';
};

type SetImage = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
};

type SlowFps = {
  type: 'slowFps';
};

type FastFps = {
  type: 'fastFps';
};

type CameraPoseUpdated = {
  type: 'cameraPoseUpdated';
  pose: ReadonlyMat4;
};

export const remoteMachine = createMachine(
  {
    types: {} as {
      context: Context;
      events:
        | ConnectEvent
        | UpdateRendererEvent
        | RenderEvent
        | SetImage
        | SlowFps
        | FastFps
        | CameraPoseUpdated;
    },
    id: 'remote',
    context: ({ input }: { input: { viewport: Viewport } }) => ({
      rendererProps: {
        density: 30,
        cameraPose: mat4.create(),
      },
      queuedRendererEvents: [],
      stagedRendererEvents: [],
      toRendererCoordinateSystem: mat4.create(),
      ...input, // captures injected viewport
    }),
    type: 'parallel',
    states: {
      // imageProcessor computes toRendererCoordinateSystem.
      // Needs to be a service because MultiscaleSpatialImage.scaleIndexToWorld is async due to coords
      imageProcessor: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              setImage: 'processing',
            },
          },
          processing: {
            invoke: {
              id: 'imageProcessor',
              src: 'imageProcessor',
              input: ({ event }) => ({
                event,
              }),
              onDone: {
                actions: [
                  assign({
                    toRendererCoordinateSystem: ({
                      event: {
                        output: { toRendererCoordinateSystem },
                      },
                    }) => toRendererCoordinateSystem,
                  }),
                  raise(
                    ({
                      event: {
                        output: { image },
                      },
                    }) => {
                      return {
                        type: 'updateRenderer' as const,
                        props: {
                          image: image.name,
                          imageScale: image.coarsestScale,
                        },
                      };
                    },
                  ),
                ],
                target: 'idle',
              },
            },
          },
        },
      },
      // root state captures initial rendererProps even when disconnected
      root: {
        entry: [
          assign({
            viewport: ({ spawn }) => spawn(viewportMachine, { id: 'viewport' }),
          }),
        ],
        on: {
          updateRenderer: {
            actions: [
              assign({
                rendererProps: ({ event: { props }, context }) => {
                  return {
                    ...context.rendererProps,
                    ...props,
                  };
                },
                queuedRendererEvents: ({ event: { props }, context }) => [
                  ...context.queuedRendererEvents,
                  ...(getEntries(props) as RendererEntries),
                ],
              }),
              // Trigger a render (if in idle state)
              raise({ type: 'render' }),
            ],
          },
          cameraPoseUpdated: {
            actions: [
              raise(({ event }) => {
                return {
                  type: 'updateRenderer' as const,
                  props: { cameraPose: event.pose },
                };
              }),
            ],
          },
        },
        initial: 'disconnected',
        states: {
          disconnected: {
            on: {
              connect: {
                actions: [
                  assign({
                    serverConfig: ({
                      event: { config },
                    }: {
                      event: ConnectEvent;
                    }) => {
                      return config;
                    },
                  }),
                ],
                target: 'connecting',
              },
            },
          },
          connecting: {
            invoke: {
              id: 'connect',
              src: 'connect',
              input: ({ context }: { context: Context }) => ({
                context,
              }),
              onDone: {
                actions: assign({
                  server: ({ event }) => event.output,
                  // initially, send all props to renderer
                  queuedRendererEvents: ({ context }) =>
                    getEntries(context.rendererProps),
                }),
                target: 'online',
              },
            },
          },
          online: {
            on: {
              slowFps: {
                actions: ['updateImageScale'],
              },
              fastFps: {
                actions: ['updateImageScale'],
              },
            },
            type: 'parallel',
            states: {
              fpsWatcher: {
                invoke: {
                  id: 'fpsWatcher',
                  src: fpsWatcher,
                },
              },
              renderLoop: {
                initial: 'render',
                states: {
                  render: {
                    invoke: {
                      id: 'render',
                      src: 'renderer',
                      input: ({ context }: { context: Context }) => ({
                        events: [...context.stagedRendererEvents],
                        context,
                      }),
                      onDone: {
                        actions: [
                          assign({
                            frame: ({ event }) => {
                              return event.output.frame;
                            },
                          }),
                          sendTo('fpsWatcher', ({ event }) => ({
                            type: 'newSample',
                            renderTime: event.output.renderTime,
                          })),
                        ],
                        target: 'idle',
                      },
                      onError: {
                        actions: (e) =>
                          console.error(
                            `Error while updating render: ${e.event}`,
                          ),
                        target: 'idle', // soldier on
                      },
                    },
                  },
                  idle: {
                    always: {
                      // Renderer props changed while rendering? Then render.
                      guard: ({ context }) =>
                        context.queuedRendererEvents.length > 0,
                      target: 'render',
                    },
                    on: {
                      render: { target: 'render' },
                    },
                    exit: assign({
                      // consumes queue in prep for renderer
                      stagedRendererEvents: ({ context }) => [
                        ...context.queuedRendererEvents,
                      ],
                      queuedRendererEvents: [],
                    }),
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      updateImageScale: ({ event, context, self }) => {
        const image = context.viewport.getSnapshot().context.image;
        if (!image || context.rendererProps.imageScale === undefined) return;

        const scaleCount = image.scaleInfos.length - 1;
        const scale = context.rendererProps.imageScale;
        const { type } = event;

        const scaleChange = type === 'slowFps' ? 1 : -1;
        const targetScale = scale + scaleChange;
        const newScale = Math.max(0, Math.min(scaleCount - 1, targetScale));

        if (newScale !== scale) {
          self.send({
            type: 'updateRenderer',
            props: { imageScale: newScale },
          });
        }
      },
    },
  },
);
