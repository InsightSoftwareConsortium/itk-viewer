import { ActorRefFrom, fromPromise, sendParent, setup } from 'xstate';
import { mat4, vec3 } from 'gl-matrix';
import { Bounds } from '@itk-viewer/utils/bounding-box.js';
import {
  BuiltImage,
  MultiscaleSpatialImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { AxisType, Axis } from './slice-utils.js';

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

export const imageBuilder = setup({
  types: {} as {
    input: {
      image: MultiscaleSpatialImage;
      scale: number;
      slice: number;
      axis: AxisType;
    };
  },
  actions: {},
  actors: {
    imageBuilder: fromPromise(
      async ({
        input: { image, scale, slice, axis },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
          slice: number; // 0 to 1 for depth on slice axis
          axis: AxisType;
        };
      }) => {
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
        const builtImage = (await image.getImageInImageSpace(
          scale,
          normalizedImageBounds,
        )) as BuiltImage;

        if (builtImage.imageType.dimension === 2) {
          return { builtImage, sliceIndex: 0 };
        }

        // buildImage could be larger than slice if cached so
        // find index of slice in builtImage
        const indexToWorld = await image.scaleIndexToWorld(scale);
        const worldToIndex = mat4.invert(mat4.create(), indexToWorld);
        const wholeImageOrigin = [...(await image.scaleOrigin(scale))] as vec3;
        if (wholeImageOrigin.length == 2) {
          wholeImageOrigin[2] = 0;
        }
        vec3.transformMat4(wholeImageOrigin, wholeImageOrigin, worldToIndex);
        const buildImageOrigin = [...builtImage.origin] as vec3;
        if (buildImageOrigin.length == 2) {
          buildImageOrigin[2] = 0;
        }
        vec3.transformMat4(buildImageOrigin, buildImageOrigin, worldToIndex);

        // vector from whole image origin to build image origin
        const wholeImageToBuildImageOrigin = vec3.subtract(
          buildImageOrigin,
          buildImageOrigin,
          wholeImageOrigin,
        );
        const builtOriginIndex =
          wholeImageToBuildImageOrigin[axisToIndex[axis]];

        const axisIndexSize =
          image.scaleInfos[scale].arrayShape.get(axisToDim[axis]) ?? 1;
        const fullImageSliceIndex = slice * axisIndexSize;

        const sliceIndexInBuildImageFloat =
          fullImageSliceIndex - builtOriginIndex;
        const sliceIndexFloat = Math.round(sliceIndexInBuildImageFloat);
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
  on: {
    cancel: {
      target: '.done',
    },
  },
  initial: 'building',
  states: {
    building: {
      invoke: {
        src: 'imageBuilder',
        input: ({ event }) => {
          return event.input;
        },
        onDone: {
          actions: [
            sendParent(({ event, self }) => {
              return {
                type: 'imageBuilt',
                builtImage: event.output.builtImage,
                sliceIndex: event.output.sliceIndex,
                actor: self,
              };
            }),
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
