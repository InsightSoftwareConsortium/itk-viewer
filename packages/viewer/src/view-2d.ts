import {
  Actor,
  AnyActorRef,
  assign,
  enqueueActions,
  fromPromise,
  setup,
  stateIn,
} from 'xstate';
import {
  MultiscaleSpatialImage,
  BuiltImage,
  ensure3dDirection,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ValueOf } from '@itk-viewer/io/types.js';
import { CreateChild } from './children.js';
import { Camera, reset2d } from './camera.js';
import { ViewportActor } from './viewport.js';
import { mat3, mat4, quat, vec3 } from 'gl-matrix';
import { XYZ, ensuredDims } from '@itk-viewer/io/dimensionUtils.js';
import { Bounds, getCorners } from '@itk-viewer/utils/bounding-box.js';

export const Axis = {
  I: 'I',
  J: 'J',
  K: 'K',
} as const;

export type AxisType = ValueOf<typeof Axis>;

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

const viewContext = {
  slice: 0.5,
  axis: Axis.K as AxisType,
  scale: 0,
  image: undefined as MultiscaleSpatialImage | undefined,
  spawned: {} as Record<string, AnyActorRef>,
  viewport: undefined as ViewportActor | undefined,
  camera: undefined as Camera | undefined,
};

const toRotation = (direction: Float64Array, axis: AxisType) => {
  const direction3d = ensure3dDirection(direction);
  // ITK (and VTKMath) uses row-major index axis, but gl-matrix uses column-major. Transpose.
  mat3.transpose(direction3d, direction3d);

  const rotation = quat.create();
  if (axis == Axis.I) {
    quat.fromEuler(rotation, 0, 90, 0);
    const roll = quat.fromEuler(quat.create(), 0, 0, 90);
    quat.multiply(rotation, rotation, roll);
  } else if (axis == Axis.J) {
    quat.fromEuler(rotation, 90, 0, 0);
  } else {
    quat.fromEuler(rotation, 0, 0, 180);
  }
  const sliceAxisRotation = mat3.fromQuat(mat3.create(), rotation);

  mat3.multiply(direction3d, direction3d, sliceAxisRotation);
  quat.fromMat3(rotation, direction3d);
  quat.normalize(rotation, rotation);

  return rotation;
};

const computeMinSizeAxis = (spacing: Array<number>, size: Array<number>) => {
  const imageSpaceSize = size.map((s, i) => s * spacing[i]);
  const iSize = imageSpaceSize[0];
  const jSize = imageSpaceSize[1];
  const kSize = imageSpaceSize[2];
  if (iSize < jSize && iSize < kSize) {
    return Axis.I;
  }
  if (jSize < iSize && jSize < kSize) {
    return Axis.J;
  }
  return Axis.K;
};

export const view2d = setup({
  types: {} as {
    context: typeof viewContext;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setSlice'; slice: number }
      | { type: 'setAxis'; axis: AxisType }
      | { type: 'setScale'; scale: number }
      | { type: 'setViewport'; viewport: ViewportActor }
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'setCamera'; camera: Camera }
      | CreateChild;
  },
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
    findDefaultAxis: fromPromise(
      async ({
        input: { image, scale },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
        };
      }) => {
        const ijkSpacing = await image.scaleSpacing(scale);
        if (ijkSpacing.length > 3) {
          ijkSpacing.push(0);
        }
        const shape = image.scaleInfos[scale].arrayShape;
        const shape3d = ensuredDims(0, ['x', 'y', 'z'], shape);
        const shapeArray = XYZ.map((axis) => shape3d.get(axis)!);
        return computeMinSizeAxis(ijkSpacing, shapeArray);
      },
    ),
  },
  actions: {
    forwardToSpawned: ({ context, event }) => {
      Object.values(context.spawned).forEach((actor) => {
        actor.send(event);
      });
    },
    resetCameraPose: async ({
      context: { image, camera, viewport, axis, scale },
    }) => {
      if (!image || !camera) return;
      const aspect = (() => {
        if (!viewport) return 1;
        const { resolution: dims } = viewport.getSnapshot().context;
        return dims[1] && dims[0] ? dims[0] / dims[1] : 1;
      })();

      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;
      const withAxis = { ...currentPose };
      withAxis.rotation = toRotation(image.direction, axis);

      const indexToWorld = await image.scaleIndexToWorld(scale);
      const indexBounds = image.getIndexExtent(scale);
      const corners = getCorners(indexBounds);

      // to world space
      const pointsToFit = corners.map((corner) => {
        return vec3.transformMat4(corner, corner, indexToWorld);
      });

      const pose = reset2d(withAxis, verticalFieldOfView, pointsToFit, aspect);

      camera.send({
        type: 'setEnableRotation',
        enable: true,
      });
      camera.send({
        type: 'setPose',
        pose,
      });
      camera.send({
        type: 'setEnableRotation',
        enable: false,
      });
    },
  },
}).createMachine({
  context: () => {
    return JSON.parse(JSON.stringify(viewContext));
  },
  id: 'view2d',
  initial: 'view2d',
  states: {
    view2d: {
      on: {
        createChild: {
          actions: [
            assign({
              spawned: ({
                spawn,
                context: { spawned, camera, axis },
                event: { logic, onActor },
                self,
              }) => {
                // @ts-expect-error cannot spawn actor of type that is not in setup()
                const child = spawn(logic, { input: { parent: self } });
                if (camera) child.send({ type: 'setCamera', camera });
                child.send({ type: 'axis', axis });
                const id = Object.keys(spawned).length.toString();
                onActor(child);
                return {
                  ...spawned,
                  [id]: child,
                };
              },
            }),
          ],
        },
        setImage: {
          actions: [
            assign({
              image: ({ event }) => event.image,
              scale: ({ event }) => event.image.coarsestScale,
              slice: 0.5,
            }),
            enqueueActions(({ context, enqueue }) => {
              Object.values(context.spawned).forEach((actor) => {
                enqueue.sendTo(actor, {
                  type: 'setImage',
                  image: context.image,
                });
              });
            }),
          ],
          target: '.findingNewImageDefaults',
        },
        setSlice: [
          // if buildingImage, rebuild image
          {
            guard: stateIn('view2d.buildingImage'),
            target: '.buildingImage',
            actions: [assign({ slice: ({ event }) => event.slice })],
          },
          // else eventually going to buildingImage
          {
            actions: [assign({ slice: ({ event }) => event.slice })],
          },
        ],
        setAxis: [
          // if buildingImage, rebuild image
          {
            guard: stateIn('view2d.buildingImage'),
            target: '.buildingImage',
            actions: [
              assign({ axis: ({ event }) => event.axis }),
              'forwardToSpawned',
              'resetCameraPose',
            ],
          },
          // else eventually going to buildingImage
          {
            actions: [
              assign({ axis: ({ event }) => event.axis }),
              'forwardToSpawned',
              'resetCameraPose',
            ],
          },
        ],
        setViewport: {
          actions: [
            assign({
              viewport: ({ event: { viewport } }) => viewport,
            }),
          ],
        },
        setResolution: {
          actions: [
            ({ context: { viewport }, event: { resolution } }) => {
              if (!viewport) return;
              viewport.send({ type: 'setResolution', resolution });
            },
          ],
        },
        setCamera: {
          actions: [
            assign({
              camera: ({ event: { camera } }) => camera,
            }),
            'resetCameraPose',
            'forwardToSpawned',
          ],
        },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            setScale: {
              actions: [
                assign({
                  scale: ({ event }) => {
                    return event.scale;
                  },
                }),
              ],
            },
          },
        },
        findingNewImageDefaults: {
          invoke: {
            input: ({ context }) => {
              const { image, scale } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
                scale,
              };
            },
            src: 'findDefaultAxis',
            onDone: {
              actions: [
                assign({
                  axis: ({ event }) => event.output,
                }),
                enqueueActions(({ context, enqueue }) => {
                  Object.values(context.spawned).forEach((actor) => {
                    enqueue.sendTo(actor, {
                      type: 'setAxis',
                      axis: context.axis,
                    });
                  });
                }),
                'resetCameraPose',
              ],
              target: 'buildingImage',
            },
          },
          on: {
            setScale: {
              actions: [
                assign({
                  scale: ({ event }) => {
                    return event.scale;
                  },
                }),
              ],
              target: '.',
              reenter: true,
            },
          },
        },
        buildingImage: {
          invoke: {
            input: ({ context }) => {
              const { image, scale, slice, axis } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
                scale,
                slice,
                axis,
              };
            },
            src: 'imageBuilder',
            onDone: {
              actions: [
                enqueueActions(({ context, enqueue, event: { output } }) => {
                  Object.values(context.spawned).forEach((actor) => {
                    enqueue.sendTo(actor, {
                      type: 'imageBuilt',
                      image: output.builtImage,
                      sliceIndex: output.sliceIndex,
                    });
                  });
                }),
              ],
            },
          },
          on: {
            setScale: {
              actions: [
                assign({
                  scale: ({ event }) => {
                    return event.scale;
                  },
                }),
              ],
              target: '.',
              reenter: true,
            },
          },
        },
      },
    },
  },
});

export type View2dActor = Actor<typeof view2d>;
