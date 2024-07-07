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
import { XYZ, ensuredDims } from '@itk-viewer/io/dimensionUtils.js';
import { getCorners } from '@itk-viewer/utils/bounding-box.js';
import { CreateChild } from './children.js';
import { Camera, reset2d } from './camera.js';
import { image, Image } from './image.js';
import { ViewportActor } from './viewport.js';
import { mat3, quat, vec3 } from 'gl-matrix';
import { AxisType, Axis } from './slice-utils.js';
import { ImageBuilder, imageBuilder } from './image-builder.js';

const IMAGE_BUILDERS_LIMIT = 4;

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
    context: {
      slice: number;
      axis: AxisType;
      scale: number;
      image?: MultiscaleSpatialImage;
      spawned: Record<string, AnyActorRef>;
      viewport?: ViewportActor;
      camera?: Camera;
      imageActor?: Image;
      imageBuilders: Array<ImageBuilder>;
    };
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setSlice'; slice: number }
      | { type: 'setAxis'; axis: AxisType }
      | { type: 'setScale'; scale: number }
      | { type: 'setViewport'; viewport: ViewportActor }
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'setCamera'; camera: Camera }
      | {
          type: 'imageBuilt';
          builtImage: BuiltImage;
          sliceIndex: number;
          actor: ImageBuilder;
        }
      | CreateChild;
  },
  actors: {
    imageBuilder,
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
    image,
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
    return {
      slice: 0.5,
      axis: Axis.K,
      scale: 0,
      spawned: {},
      imageBuilders: [],
    };
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
                // view-2d-vtkjs could be a child actor
                // @ts-expect-error cannot spawn actor of type that is not in setup()
                const child = spawn(logic, {
                  input: { parent: self },
                }) as AnyActorRef;
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
              imageActor: ({ event, spawn }) =>
                spawn('image', { input: event.image }),
            }),
            enqueueActions(({ context, enqueue }) => {
              Object.values(context.spawned).forEach((actor) => {
                enqueue.sendTo(actor, {
                  type: 'setImage',
                  image: context.image,
                });
                enqueue.sendTo(actor, {
                  type: 'setImageActor',
                  image: context.imageActor,
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
          entry: [
            assign({
              imageBuilders: ({
                context: { imageBuilders, scale, slice, axis, image },
                spawn,
              }) => {
                if (!image) throw new Error('No image available');
                const actor = spawn('imageBuilder', {
                  input: { scale, slice, axis, image },
                });

                const cancelCount = imageBuilders.length - IMAGE_BUILDERS_LIMIT;
                if (cancelCount > 0) {
                  const staleActors = imageBuilders.splice(0, cancelCount);
                  staleActors.forEach((actor) => {
                    actor.send({ type: 'cancel' });
                  });
                }
                return [...imageBuilders, actor];
              },
            }),
          ],
          on: {
            imageBuilt: {
              actions: [
                enqueueActions(
                  ({
                    context: { imageBuilders, spawned, imageActor },
                    enqueue,
                    event: { builtImage, sliceIndex, actor },
                  }) => {
                    const actorIndex = imageBuilders.indexOf(actor);
                    const isStale = actorIndex === -1;
                    if (isStale) return;

                    Object.values(spawned).forEach((actor) => {
                      enqueue.sendTo(actor, {
                        type: 'imageBuilt',
                        image: builtImage,
                        sliceIndex: sliceIndex,
                      });
                    });
                    enqueue.sendTo(imageActor!, {
                      type: 'builtImage',
                      builtImage: builtImage,
                    });

                    const staleActors = imageBuilders.splice(0, actorIndex + 1);
                    staleActors.forEach((actor) => {
                      enqueue.sendTo(actor, { type: 'cancel' });
                    });
                    enqueue.assign({
                      imageBuilders: [...imageBuilders],
                    });
                  },
                ),
              ],
            },
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
