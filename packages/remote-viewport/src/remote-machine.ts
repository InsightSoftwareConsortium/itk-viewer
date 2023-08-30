import { ReadonlyMat4, mat4 } from 'gl-matrix';
import { assign, createMachine, raise, sendTo } from 'xstate';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { fpsWatcher } from '@itk-viewer/viewer/fps-watcher-machine.js';
import { Image } from './types.js';

type MultiscaleImage = {
  scaleCount: number;
  scale: number;
};

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
  viewport: Viewport;

  // TODO: move to viewport machine
  image?: MultiscaleImage;
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

type SetMultiscaleImage = {
  type: 'setMultiscaleImage';
  image: MultiscaleImage;
};

type SlowFps = {
  type: 'slowFps';
};

type FastFps = {
  type: 'fastFps';
};

export const remoteMachine = createMachine(
  {
    types: {} as {
      context: Context;
      events:
        | ConnectEvent
        | UpdateRendererEvent
        | RenderEvent
        | SetMultiscaleImage
        | SlowFps
        | FastFps;
    },
    id: 'remote',
    context: ({ input }: { input: { viewport: Viewport } }) => ({
      rendererProps: {
        density: 30,
        cameraPose: mat4.create(),
      },
      queuedRendererEvents: [],
      stagedRendererEvents: [],
      ...input, // captures injected viewport
    }),

    initial: 'root',
    states: {
      // root state captures initial rendererProps even when disconnected
      root: {
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
          setMultiscaleImage: {
            actions: [
              assign({
                image: ({ event: { image } }) => image,
              }),
            ],
          },
        },
        initial: 'disconnected',
        states: {
          disconnected: {
            entry: ({ context, self }) => {
              // Update camera pose on viewport change
              context.viewport.subscribe(() => {
                const cameraPose = context.viewport
                  .getSnapshot()
                  .context.camera?.getSnapshot().context.pose;
                if (!cameraPose) throw new Error('no camera pose');
                self.send({
                  type: 'updateRenderer',
                  props: { cameraPose },
                });
              });
            },
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
                        server: context.server,
                        events: [...context.stagedRendererEvents],
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
                          console.error('Error while updating render', e),
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
        if (!context.image) throw new Error('no scaleImage');

        const { scaleCount, scale } = context.image;
        const { type } = event;

        const scaleChange = type === 'slowFps' ? 1 : -1;
        const targetScale = scale + scaleChange;
        const newScale = Math.max(0, Math.min(scaleCount - 1, targetScale));

        if (newScale !== scale) {
          context.image.scale = newScale;
          self.send({
            type: 'updateRenderer',
            props: { imageScale: newScale },
          });
        }
      },
    },
  },
);
