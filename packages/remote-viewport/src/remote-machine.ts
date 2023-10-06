import { ReadonlyMat4, mat4 } from 'gl-matrix';
import {
  ActorRefFrom,
  assign,
  createMachine,
  fromPromise,
  raise,
  sendTo,
} from 'xstate';
import type { Image } from '@itk-wasm/htj2k';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { fpsWatcher } from '@itk-viewer/viewer/fps-watcher-machine.js';
import { viewportMachine } from '@itk-viewer/viewer/viewport-machine.js';
import {
  MultiscaleSpatialImage,
  getVoxelCount,
  getBytes,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';

const MAX_IMAGE_BYTES_DEFAULT = 4000 * 1000 * 1000; // 4000 MB

type RendererProps = {
  density: number;
  cameraPose: ReadonlyMat4;
  image?: string;
  imageScale?: number;
  size: [number, number];
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
  maxImageBytes: number;
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

type Event =
  | ConnectEvent
  | UpdateRendererEvent
  | RenderEvent
  | SetImage
  | SlowFps
  | FastFps
  | CameraPoseUpdated
  | { type: 'done.invoke.updateImageScale'; output: number }
  | { type: 'setResolution'; resolution: [number, number] };

type ActionArgs = { event: Event; context: Context };

const getTargetScale = ({ event, context }: ActionArgs) => {
  const image = context.viewport.getSnapshot().context.image;
  if (!image || context.rendererProps.imageScale === undefined)
    throw new Error('image or imageScale not found');

  const currentScale = context.rendererProps.imageScale;
  const { type } = event;

  const scaleChange = type === 'slowFps' ? 1 : -1;
  const targetScale = currentScale + scaleChange;
  return Math.max(0, Math.min(image.coarsestScale, targetScale));
};

const checkTargetScaleExists = ({ event, context }: ActionArgs) => {
  const image = context.viewport.getSnapshot().context.image;
  if (!image || context.rendererProps.imageScale === undefined)
    throw new Error('image or imageScale not found');

  const targetScale = getTargetScale({ event, context });
  const currentScale = context.rendererProps.imageScale;
  return targetScale !== currentScale;
};

// Assumes image.scaleIndexToWorld has been called with target scale
const checkMemory = async ({ event, context }: ActionArgs) => {
  const image = context.viewport.getSnapshot().context.image;
  if (!image) throw new Error('image found');

  const targetScale = getTargetScale({ event, context });
  const voxelCount = await getVoxelCount(image, targetScale);
  const imageBytes = getBytes(image, voxelCount);

  return imageBytes < context.maxImageBytes;
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: Event;
  },
  id: 'remote',
  context: ({ input }: { input: { viewport: Viewport } }) => ({
    rendererProps: {
      density: 30,
      cameraPose: mat4.create(),
      size: [1, 1] as [number, number],
    },
    queuedRendererEvents: [],
    stagedRendererEvents: [],
    toRendererCoordinateSystem: mat4.create(),
    maxImageBytes: MAX_IMAGE_BYTES_DEFAULT,
    ...input,
  }),
  type: 'parallel',
  states: {
    // imageProcessor computes toRendererCoordinateSystem.
    // Is an actor because MultiscaleSpatialImage.scaleIndexToWorld is async due to coords
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
    // root state captures initial rendererProps events even when disconnected
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
        setResolution: {
          actions: [
            raise(({ event }) => {
              return {
                type: 'updateRenderer' as const,
                props: { size: event.resolution },
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
            input: ({ context, event }) => ({
              context,
              event,
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
          type: 'parallel',
          states: {
            fpsWatcher: {
              invoke: {
                id: 'fpsWatcher',
                src: fpsWatcher,
              },
            },
            imageScaleUpdater: {
              on: {
                slowFps: {
                  target: '.updatingScale',
                },
                fastFps: {
                  target: '.updatingScale',
                },
              },
              initial: 'idle',
              states: {
                idle: {},
                updatingScale: {
                  invoke: {
                    id: 'updateImageScale',
                    input: ({ context, event }) => ({
                      context,
                      event,
                    }),
                    src: fromPromise(async ({ input: { event, context } }) => {
                      const image =
                        context.viewport.getSnapshot().context.image;
                      if (!image) return; // may be rendering without image

                      if (!checkTargetScaleExists({ event, context })) return;
                      if (!(await checkMemory({ event, context }))) return;

                      return getTargetScale({ event, context });
                    }),
                    onDone: {
                      guard: ({ event }) => event.output !== undefined,
                      target: 'raiseImageScale',
                    },
                  },
                },
                raiseImageScale: {
                  entry: raise(({ event }) => {
                    if (event.type !== 'done.invoke.updateImageScale')
                      throw new Error('Unexpected event type');
                    return {
                      type: 'updateRenderer' as const,
                      props: { imageScale: event.output },
                    };
                  }),
                },
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
                          `Error while updating render.`,
                          e.event.data,
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
});
