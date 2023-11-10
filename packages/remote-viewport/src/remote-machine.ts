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
  imageScale: number;
  // computed image values
  toRendererCoordinateSystem: ReadonlyMat4;
  imageWorldBounds: Bounds;
  imageIndexClipBounds?: ReadOnlyDimensionBounds;
  loadedImageIndexBounds?: ReadOnlyDimensionBounds;
  clipBounds: Bounds;
  loadedImageClipBounds: Bounds;
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

type ImageAssigned = {
  type: 'imageAssigned';
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

type UpdateImageScaleResult =
  | { type: 'noChange' }
  | { type: 'coarserScale'; imageScale: number }
  | { type: 'load'; imageScale: number };

type UpdateImageScaleDone = {
  type: 'xstate.done.actor.updateImageScale';
  output: UpdateImageScaleResult;
};

type Event =
  | ConnectEvent
  | UpdateRendererEvent
  | RenderEvent
  | ImageAssigned
  | SlowFps
  | FastFps
  | CameraPoseUpdated
  | UpdateImageScaleDone
  | ImageProcessorDone
  | { type: 'setResolution'; resolution: [number, number] }
  | { type: 'setClipBounds'; clipBounds: Bounds }
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
  clipBounds: Bounds,
) => {
  const voxelCount = await getVoxelCount(image, targetScale, clipBounds);
  return getBytes(image, voxelCount);
};

const EPSILON = 0.000001;

const checkBoundsBigger = (
  fullImage: Bounds,
  benchmark: Bounds,
  sample: Bounds,
) => {
  // clamp rendered bounds to max size of image
  sample.forEach((b, i) => {
    sample[i] =
      i % 2
        ? Math.min(b, fullImage[i]) // high bound case
        : Math.max(b, fullImage[i]); // low bound case
  });

  return benchmark.some((loaded, i) => {
    return i % 2
      ? sample[i] - loaded > EPSILON // high bound case: currentBounds[i] > loadedBound
      : loaded - sample[i] > EPSILON; // low bound case: currentBounds[i] < loadedBound
  });
};

export const remoteMachine = createMachine(
  {
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

      imageScale: 0,
      // computed async image values
      toRendererCoordinateSystem: mat4.create(),
      imageWorldBounds: createBounds(),
      clipBounds: createBounds(),
      loadedImageClipBounds: createBounds(),
      imageWorldToIndex: mat4.create(),

      maxImageBytes: MAX_IMAGE_BYTES_DEFAULT,
      ...input,
    }),
    type: 'parallel',
    states: {
      imageProcessor: {
        initial: 'idle',
        on: {
          imageAssigned: '.updatingScale',
          setImageScale: '.updatingScale',
        },
        states: {
          idle: {},
          raiseCoarserScale: {
            entry: raise(({ event }) => {
              const result = (event as UpdateImageScaleDone).output;
              if (result.type === 'coarserScale') {
                return {
                  type: 'setImageScale' as const,
                  imageScale: result.imageScale,
                };
              }
              throw new Error('Unexpected result type: ' + result.type);
            }),
          },
          updatingScale: {
            // Ensure imageScale is not the same as before and fits in memory
            id: 'updateImageScale',
            invoke: {
              input: ({ context, event }) => {
                const image = getImage(context);
                const getImageScale = () => {
                  if (event.type === 'setImageScale') return event.imageScale;
                  if (event.type === 'imageAssigned')
                    return image.coarsestScale;
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

                const boundsBiggerThanLoaded = checkBoundsBigger(
                  context.imageWorldBounds,
                  context.loadedImageClipBounds,
                  context.clipBounds,
                );
                if (
                  !boundsBiggerThanLoaded &&
                  imageScale === context.imageScale
                )
                  return { type: 'noChange' }; // no new data to load

                // Always try to load base scale
                if (imageScale !== image.coarsestScale) {
                  const imageBytes = await computeBytes(
                    image,
                    imageScale,
                    context.clipBounds,
                  );
                  if (imageBytes > context.maxImageBytes)
                    return { type: 'coarserScale', imageScale: imageScale + 1 };
                }

                return { type: 'load', imageScale };
              }),
              onDone: [
                {
                  guard: ({ event }) => event.output.type === 'coarserScale',
                  target: 'raiseCoarserScale',
                },
                {
                  guard: ({ event }) => event.output.type === 'load',
                  target: 'updatingComputedValues',
                },
              ],
            },
          },
          updatingComputedValues: {
            entry: [
              assign({
                imageScale: ({ event }) => {
                  const result = (event as UpdateImageScaleDone).output;
                  if (result.type === 'load') return result.imageScale;
                  throw new Error('Unexpected result type: ' + result.type);
                },
              }),
            ],
            // For new image scale, compute imageWorldBounds, imageWorldToIndex, toRendererCoordinateSystem
            invoke: {
              src: 'imageProcessor',
              input: ({ context }) => {
                const image = getImage(context);
                const { imageScale, clipBounds } = context;
                return {
                  image,
                  imageScale,
                  clipBounds,
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
                  'computeImageIndexClipBounds',
                  assign({
                    loadedImageIndexBounds: ({ context }) =>
                      context.imageIndexClipBounds,
                    loadedImageClipBounds: ({ context }) => context.clipBounds,
                  }),
                ],
                target: 'checkingFirstImage',
              },
            },
          },
          checkingFirstImage: {
            always: [
              {
                guard: ({ context }) =>
                  context.rendererState.image === undefined,
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
              };
            }),
            always: 'sendingToRenderer',
          },
          sendingToRenderer: {
            entry: [
              raise(({ event }) => {
                const { image, imageScale } = (event as ImageProcessorDone)
                  .output;
                return {
                  type: 'updateRenderer' as const,
                  state: {
                    image: image.name,
                    imageScale,
                  },
                };
              }),
              'updateNormalizedClipBounds',
            ],
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
              'computeImageIndexClipBounds',
              'updateNormalizedClipBounds',
              raise(({ context }) => {
                return {
                  type: 'setImageScale' as const,
                  imageScale: context.imageScale,
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
  },
  {
    actions: {
      computeImageIndexClipBounds: assign({
        imageIndexClipBounds: ({
          context: { viewport, imageWorldToIndex, clipBounds, imageScale },
        }) => {
          const { image } = viewport.getSnapshot().context;
          if (!image || imageScale === undefined)
            throw new Error('image or imageScale not found');
          const fullIndexBounds = image.getIndexBounds(imageScale);
          return worldBoundsToIndexBounds({
            bounds: clipBounds,
            fullIndexBounds,
            worldToIndex: imageWorldToIndex,
          });
        },
      }),
      updateNormalizedClipBounds: raise(
        ({
          context: {
            viewport,
            imageIndexClipBounds,
            loadedImageIndexBounds,
            imageScale,
          },
        }) => {
          const { image } = viewport.getSnapshot().context;
          if (!image || imageScale === undefined)
            throw new Error('image or imageScale not found');
          if (!imageIndexClipBounds)
            throw new Error('imageIndexClipBounds not found');
          if (!loadedImageIndexBounds)
            throw new Error('loadedImageIndexBounds not found');

          // Compute normalized bounds in loaded image space
          const spatialImageBounds = ensuredDims(
            [0, 1],
            XYZ,
            loadedImageIndexBounds,
          );
          const normalizedClipBounds = XYZ.flatMap((dim) => {
            const [floor, top] = spatialImageBounds.get(dim)!;
            const range = top - floor;
            return imageIndexClipBounds
              .get(dim)!
              .map((v) => (v - floor) / range);
          }) as Bounds;
          return {
            type: 'updateRenderer' as const,
            state: { normalizedClipBounds },
          };
        },
      ),
    },
  },
);
