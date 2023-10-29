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
  worldBoundsToIndexBounds,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Bounds, ReadOnlyDimensionBounds } from '@itk-viewer/io/types.js';
import {
  XYZ,
  createBounds,
  ensuredDims,
} from '@itk-viewer/io/dimensionUtils.js';

const MAX_IMAGE_BYTES_DEFAULT = 4000 * 1000 * 1000; // 4000 MB

type RendererState = {
  density: number;
  cameraPose: ReadonlyMat4;
  renderSize: [number, number];
  image?: string;
  imageScale?: number;
  normalizedClipBounds: Bounds;
};

// https://stackoverflow.com/a/74823834
type Entries<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T][];

const getEntries = <T extends object>(obj: T) =>
  Object.entries(obj) as Entries<T>;

// example: [['density', 30], ['cameraPose', mat4.create()]]
export type RendererEntries = Entries<RendererState>;

export type Context = {
  serverConfig?: unknown;
  server?: unknown;
  frame?: Image;
  rendererState: RendererState;
  queuedRendererCommands: RendererEntries;
  stagedRendererCommands: RendererEntries;
  viewport: ActorRefFrom<typeof viewportMachine>;
  maxImageBytes: number;
  // computed image values
  toRendererCoordinateSystem: ReadonlyMat4;
  imageWorldBounds: Bounds;
  imageIndexClipBounds?: ReadOnlyDimensionBounds;
  clipBounds: Bounds;
  imageWorldToIndex: ReadonlyMat4;
};

type ConnectEvent = {
  type: 'connect';
  config: unknown;
};

type UpdateRendererEvent = {
  type: 'updateRenderer';
  state: Partial<RendererState>;
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

type ImageProcessorDone = {
  type: 'xstate.done.actor.imageProcessor';
  output: {
    bounds: Bounds;
    toRendererCoordinateSystem: ReadonlyMat4;
    imageScale: number;
    image: MultiscaleSpatialImage;
  };
};

type UpdateImageScaleDone = {
  type: 'xstate.done.actor.updateImageScale';
  output: number;
};

type Event =
  | ConnectEvent
  | UpdateRendererEvent
  | RenderEvent
  | SetImage
  | SlowFps
  | FastFps
  | CameraPoseUpdated
  | UpdateImageScaleDone
  | ImageProcessorDone
  | { type: 'setResolution'; resolution: [number, number] }
  | { type: 'setClipBounds'; clipBounds: Bounds; imageScale?: number }
  | { type: 'setImageScale'; imageScale: number }
  | { type: 'sendCommands' };

type ActionArgs = { event: Event; context: Context };

const getImage = (context: Context) => {
  const { image } = context.viewport.getSnapshot().context;
  if (!image) throw new Error('Image not found');
  return image;
};

const getTargetScale = ({ event, context }: ActionArgs) => {
  const image = getImage(context);
  if (context.rendererState.imageScale === undefined)
    throw new Error('imageScale not found');

  const currentScale = context.rendererState.imageScale;
  const scaleChange = event.type === 'slowFps' ? 1 : -1;
  const targetScale = currentScale + scaleChange;
  return Math.max(0, Math.min(image.coarsestScale, targetScale));
};

const computeBytes = async (
  image: MultiscaleSpatialImage,
  targetScale: number,
) => {
  const voxelCount = await getVoxelCount(image, targetScale);
  return getBytes(image, voxelCount);
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: Event;
  },
  id: 'remote',
  context: ({ input }: { input: { viewport: Viewport } }) => ({
    rendererState: {
      density: 30,
      cameraPose: mat4.create(),
      renderSize: [1, 1] as [number, number],
      normalizedClipBounds: [0, 1, 0, 1, 0, 1] as Bounds,
    },
    queuedRendererCommands: [],
    stagedRendererCommands: [],

    // computed async image values
    toRendererCoordinateSystem: mat4.create(),
    imageWorldBounds: createBounds(),
    clipBounds: createBounds(),
    imageWorldToIndex: mat4.create(),

    maxImageBytes: MAX_IMAGE_BYTES_DEFAULT,
    ...input,
  }),
  type: 'parallel',
  states: {
    imageProcessor: {
      initial: 'idle',
      on: {
        setImage: '.updatingScale',
        setImageScale: '.updatingScale',
      },
      states: {
        idle: {},
        updatingScale: {
          // Ensure imageScale is not the same as before and fits in memory
          id: 'updateImageScale',
          invoke: {
            input: ({ context, event }) => {
              const image = getImage(context);
              const getImageScale = () => {
                if (event.type === 'setImageScale') return event.imageScale;
                if (event.type === 'setImage') return image.coarsestScale;
                throw new Error('Unexpected event type: ' + event.type);
              };
              const imageScale = getImageScale();
              return {
                context,
                imageScale,
              };
            },
            src: fromPromise(async ({ input: { imageScale, context } }) => {
              const image = getImage(context);

              if (imageScale === context.rendererState.imageScale) return;

              const imageBytes = await computeBytes(image, imageScale);
              if (imageBytes > context.maxImageBytes) return;

              return imageScale;
            }),
            onDone: {
              guard: ({ event }) => event.output !== undefined,
              target: 'updatingComputedValues',
            },
          },
        },
        updatingComputedValues: {
          // For new image scale, compute imageWorldBounds, imageWorldToIndex, toRendererCoordinateSystem
          invoke: {
            src: 'imageProcessor',
            input: ({ context, event }) => {
              const image = getImage(context);
              const imageScale = (event as UpdateImageScaleDone).output;
              return {
                image,
                imageScale,
              };
            },
            onDone: {
              actions: [
                assign({
                  toRendererCoordinateSystem: ({
                    event: {
                      output: { toRendererCoordinateSystem },
                    },
                  }) => toRendererCoordinateSystem,
                  imageWorldBounds: ({
                    event: {
                      output: { bounds },
                    },
                  }) => bounds,
                  imageWorldToIndex: ({
                    event: {
                      output: { imageWorldToIndex },
                    },
                  }) => imageWorldToIndex,
                }),
              ],
              target: 'checkingFirstImage',
            },
          },
        },
        checkingFirstImage: {
          always: [
            {
              guard: ({ context }) => context.rendererState.image === undefined,
              target: 'initClipBounds',
            },
            { target: 'sendingToRenderer' },
          ],
        },
        initClipBounds: {
          entry: raise(({ event }) => {
            return {
              type: 'setClipBounds' as const,
              clipBounds: (event as ImageProcessorDone).output.bounds,
              imageScale: (event as ImageProcessorDone).output.imageScale,
            };
          }),
          always: 'sendingToRenderer',
        },
        sendingToRenderer: {
          entry: raise(({ event }) => {
            const { image, imageScale } = (event as ImageProcessorDone).output;
            return {
              type: 'updateRenderer' as const,
              state: {
                image: image.name,
                imageScale,
              },
            };
          }),
        },
      },
    },
    // root state captures initial updateRenderer events, even when disconnected
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
              rendererState: ({ event: { state }, context }) => {
                return {
                  ...context.rendererState,
                  ...state,
                };
              },
              queuedRendererCommands: ({ event: { state }, context }) => [
                ...context.queuedRendererCommands,
                ...(getEntries(state) as RendererEntries),
              ],
            }),
            // Trigger a render (if in idle state)
            raise({ type: 'sendCommands' }),
          ],
        },
        cameraPoseUpdated: {
          actions: [
            raise(({ event }) => {
              return {
                type: 'updateRenderer' as const,
                state: { cameraPose: event.pose },
              };
            }),
          ],
        },
        setResolution: {
          actions: [
            raise(({ event }) => {
              return {
                type: 'updateRenderer' as const,
                state: { renderSize: event.resolution },
              };
            }),
          ],
        },
        setClipBounds: {
          actions: [
            assign({
              clipBounds: ({ event: { clipBounds } }) => clipBounds,
            }),
            raise(
              ({
                context: {
                  viewport,
                  clipBounds,
                  imageWorldToIndex,
                  rendererState,
                },
                event,
              }) => {
                const imageScale = event.imageScale ?? rendererState.imageScale;
                const { image } = viewport.getSnapshot().context;
                if (!image || imageScale === undefined)
                  throw new Error('image or imageScale not found');
                const fullIndexBounds = image.getIndexBounds(imageScale);
                const imageIndexClipBounds = worldBoundsToIndexBounds({
                  bounds: clipBounds,
                  fullIndexBounds,
                  worldToIndex: imageWorldToIndex,
                });

                // Compute normalized bounds in image space
                const spatialImageBounds = ensuredDims(
                  [0, 1],
                  XYZ,
                  fullIndexBounds,
                );
                const ranges = Object.fromEntries(
                  XYZ.map((dim) => [dim, spatialImageBounds.get(dim)![1]]),
                );
                const normalizedClipBounds = XYZ.flatMap(
                  (dim) =>
                    imageIndexClipBounds.get(dim)?.map((v) => v / ranges[dim]),
                ) as Bounds;

                return {
                  type: 'updateRenderer' as const,
                  state: { normalizedClipBounds },
                };
              },
            ),
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
                // initially, send all commands to renderer
                queuedRendererCommands: ({ context }) =>
                  getEntries(context.rendererState),
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
                  actions: raise(({ context, event }) => {
                    return {
                      type: 'setImageScale' as const,
                      imageScale: getTargetScale({ context, event }),
                    };
                  }),
                },
                fastFps: {
                  actions: raise(({ context, event }) => {
                    return {
                      type: 'setImageScale' as const,
                      imageScale: getTargetScale({ context, event }),
                    };
                  }),
                },
              },
            },
            commandLoop: {
              initial: 'sendingCommands',
              states: {
                sendingCommands: {
                  invoke: {
                    id: 'commandSender',
                    src: 'commandSender',
                    input: ({ context }: { context: Context }) => ({
                      commands: [...context.stagedRendererCommands],
                      context,
                    }),
                    onDone: {
                      target: 'idle',
                    },
                    onError: {
                      actions: (e) =>
                        console.error(
                          `Error while sending commands.`,
                          (e.event.data as Error).stack ?? e.event.data,
                        ),
                      target: 'idle', // soldier on
                    },
                  },
                },
                idle: {
                  always: {
                    // More commands while sending commands? Then send commands.
                    guard: ({ context }) =>
                      context.queuedRendererCommands.length > 0,
                    target: 'sendingCommands',
                  },
                  on: {
                    sendCommands: { target: 'sendingCommands' },
                  },
                  exit: assign({
                    // consumes queue in prep for renderer
                    stagedRendererCommands: ({ context }) => [
                      ...context.queuedRendererCommands,
                    ],
                    queuedRendererCommands: [],
                  }),
                },
              },
            },
            renderLoop: {
              initial: 'render',
              states: {
                render: {
                  invoke: {
                    id: 'renderer',
                    src: 'renderer',
                    input: ({ context }: { context: Context }) => ({
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
                          `Error while updating renderer.`,
                          (e.event.data as Error).stack ?? e.event.data,
                        ),
                      target: 'idle', // soldier on
                    },
                  },
                },
                idle: {
                  on: {
                    render: { target: 'render' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
