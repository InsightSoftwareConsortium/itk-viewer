import {
  ActorRefFrom,
  AnyActorRef,
  assign,
  enqueueActions,
  fromPromise,
  sendParent,
  setup,
} from 'xstate';
import { mat4, vec3 } from 'gl-matrix';
import { Bounds } from '@itk-viewer/utils/bounding-box.js';
import {
  BuiltImage,
  MultiscaleSpatialImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { AxisType, Axis } from './slice-utils.js';
import { Image } from './image.js';

const axisToIndex = {
  I: 0,
  J: 1,
  K: 2,
} as const;

// To MultiScaleImage dimension
const axisToDim = {
  I: 'x',
  J: 'y',
  K: 'z',
} as const;

export const imageWorker = setup({
  types: {} as {
    input: { image: MultiscaleSpatialImage; listeners: AnyActorRef[] };
    context: {
      image: MultiscaleSpatialImage;
      listeners: AnyActorRef[];
    };
    events: {
      type: 'buildImageInImageSpace';
      scale: number;
      normalizedImageBounds: Bounds;
    };
  },
  actors: {
    imageSpaceBuilder: fromPromise(
      ({
        input: { image, scale, normalizedImageBounds },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
          normalizedImageBounds: Bounds;
        };
      }) => {
        return image.getImageInImageSpace(scale, normalizedImageBounds);
      },
    ),
  },
}).createMachine({
  id: 'imageWorker',
  initial: 'idle',
  context: ({ input }) => input,
  states: {
    idle: {
      on: {
        buildImageInImageSpace: {
          target: 'buildingImage',
        },
      },
    },
    buildingImage: {
      invoke: {
        input: ({ context, event }) => ({
          image: context.image,
          scale: event.scale,
          normalizedImageBounds: event.normalizedImageBounds,
        }),
        src: 'imageSpaceBuilder',
        onDone: {
          actions: [
            enqueueActions(({ context, event: { output: builtImage } }) => {
              context.listeners.forEach((listener) => {
                listener.send({
                  type: 'builtImage',
                  builtImage,
                });
              });
            }),
          ],
          target: 'idle',
        },
      },
    },
  },
});

export type ImageWorker = ActorRefFrom<typeof imageWorker>;

export const imageBuilder = setup({
  types: {} as {
    input: {
      image: MultiscaleSpatialImage;
      imageActor: Image;
      scale: number;
      slice: number;
      axis: AxisType;
    };
    context: {
      slice: number;
      axis: AxisType;
      scale: number;
      image: MultiscaleSpatialImage;
      imageActor?: Image;
      builtImage?: BuiltImage;
      worker?: ImageWorker;
    };
  },
  actors: {
    imageWorker,
    findSliceIndex: fromPromise(
      async ({
        input: { image, builtImage, scale, slice, axis },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          builtImage: BuiltImage;
          scale: number;
          slice: number; // 0 to 1 for depth on slice axis
          axis: AxisType;
        };
      }) => {
        if (builtImage.imageType.dimension === 2) {
          return { builtImage, sliceIndex: 0 };
        }
        // builtImage could be larger than slice if cached so
        // find index of slice in builtImage
        const indexToWorld = await image.scaleIndexToWorld(scale);
        const worldToIndex = mat4.invert(mat4.create(), indexToWorld);
        const wholeImageOrigin = [...(await image.scaleOrigin(scale))] as vec3;
        if (wholeImageOrigin.length == 2) {
          wholeImageOrigin[2] = 0;
        }
        vec3.transformMat4(wholeImageOrigin, wholeImageOrigin, worldToIndex);
        const builtImageOrigin = [...builtImage.origin] as vec3;
        if (builtImageOrigin.length == 2) {
          builtImageOrigin[2] = 0;
        }
        vec3.transformMat4(builtImageOrigin, builtImageOrigin, worldToIndex);

        // vector from whole image origin to build image origin
        const wholeImageToBuiltImageOrigin = vec3.subtract(
          builtImageOrigin,
          builtImageOrigin,
          wholeImageOrigin,
        );
        const builtOriginIndex =
          wholeImageToBuiltImageOrigin[axisToIndex[axis]];

        const axisIndexSize =
          image.scaleInfos[scale].arrayShape.get(axisToDim[axis]) ?? 1;
        const fullImageSliceIndex = slice * axisIndexSize;

        const sliceIndexInBuiltImageFloat =
          fullImageSliceIndex - builtOriginIndex;
        const sliceIndexFloat = Math.round(sliceIndexInBuiltImageFloat);
        // Math.round goes up with .5, so clamp to max index
        const sliceIndex = Math.max(
          0,
          Math.min(sliceIndexFloat, builtImage.size[axisToIndex[axis]] - 1),
        );
        return { builtImage, sliceIndex };
      },
    ),
  },
}).createMachine({
  id: 'imageBuilder',
  context: ({ input }) => {
    return input;
  },
  on: {
    cancel: {
      target: '.done',
    },
  },
  initial: 'building',
  states: {
    building: {
      entry: [
        assign({
          worker: ({
            event: {
              input: { imageActor },
            },
            context: { image },
            spawn,
            self,
          }) => {
            return spawn('imageWorker', {
              input: {
                image,
                listeners: [self, imageActor],
              },
            });
          },
        }),
        ({ context: { scale, slice, axis, worker } }) => {
          const normalizedImageBounds = [0, 1, 0, 1, 0, 1] as Bounds;
          if (axis === Axis.I) {
            normalizedImageBounds[0] = slice;
            normalizedImageBounds[1] = slice;
          } else if (axis === Axis.J) {
            normalizedImageBounds[2] = slice;
            normalizedImageBounds[3] = slice;
          } else if (axis === Axis.K) {
            normalizedImageBounds[4] = slice;
            normalizedImageBounds[5] = slice;
          }
          worker!.send({
            type: 'buildImageInImageSpace',
            scale,
            normalizedImageBounds,
          });
        },
      ],
      on: {
        builtImage: {
          actions: [
            assign({
              builtImage: ({ event }) => event.builtImage,
            }),
          ],
          target: 'findingSliceIndex',
        },
      },
    },
    findingSliceIndex: {
      invoke: {
        src: 'findSliceIndex',
        input: ({ context }) => ({
          image: context.image,
          builtImage: context.builtImage!,
          scale: context.scale,
          slice: context.slice,
          axis: context.axis,
        }),
        onDone: {
          actions: [
            sendParent(({ context, event: { output }, self }) => ({
              type: 'imageBuilt',
              builtImage: context.builtImage,
              sliceIndex: output.sliceIndex,
              actor: self,
            })),
          ],
          target: 'done',
        },
      },
    },
    done: {
      type: 'final',
    },
  },
});

export type ImageBuilder = ActorRefFrom<typeof imageBuilder>;
export type ImageBuilderSnapshot = ReturnType<ImageBuilder['getSnapshot']>;
