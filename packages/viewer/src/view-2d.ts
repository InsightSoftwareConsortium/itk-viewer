import {
  Actor,
  AnyActorRef,
  assign,
  enqueueActions,
  fromPromise,
  setup,
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
import { quat, vec3 } from 'gl-matrix';
import { XYZ, ensuredDims } from '@itk-viewer/io/dimensionUtils.js';
import { getCorners } from '@itk-viewer/utils/bounding-box.js';

export const AXIS = {
  I: 'I',
  J: 'J',
  K: 'K',
} as const;

export type Axis = ValueOf<typeof AXIS>;

const axisToIndex = {
  I: 0,
  J: 1,
  K: 2,
} as const;

const viewContext = {
  slice: 0.5,
  axis: AXIS.K as Axis,
  scale: 0,
  image: undefined as MultiscaleSpatialImage | undefined,
  spawned: {} as Record<string, AnyActorRef>,
  viewport: undefined as ViewportActor | undefined,
  camera: undefined as Camera | undefined,
};

const toRotation = (direction: Float64Array, axis: Axis) => {
  const dir3d = ensure3dDirection(direction);

  const x = vec3.fromValues(dir3d[0], dir3d[1], dir3d[2]);
  const y = vec3.fromValues(dir3d[3], dir3d[4], dir3d[5]);
  const z = vec3.fromValues(dir3d[6], dir3d[7], dir3d[8]);

  const rotation = quat.create();
  if (axis == AXIS.I) {
    quat.setAxes(rotation, x, z, y);
  } else if (axis == AXIS.J) {
    quat.setAxes(rotation, y, x, z); // negate z?
  } else {
    vec3.negate(z, z);
    quat.setAxes(rotation, z, x, y);
  }
  return rotation;
};

const computeMinSizeAxis = (spacing: Array<number>, size: Array<number>) => {
  const imageSpaceSize = size.map((s, i) => s * spacing[i]);
  const iSize = imageSpaceSize[0];
  const jSize = imageSpaceSize[1];
  const kSize = imageSpaceSize[2];
  if (iSize < jSize && iSize < kSize) {
    return AXIS.I;
  }
  if (jSize < iSize && jSize < kSize) {
    return AXIS.J;
  }
  return AXIS.K;
};

export const view2d = setup({
  types: {} as {
    context: typeof viewContext;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setSlice'; slice: number }
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
          slice: number;
          axis: Axis;
        };
      }) => {
        const worldBounds = await image.getWorldBounds(scale);
        let sliceWorldPos = 0;
        if (axis === AXIS.I) {
          const xWidth = worldBounds[1] - worldBounds[0];
          sliceWorldPos = worldBounds[0] + xWidth * slice; // world X pos
          worldBounds[0] = sliceWorldPos;
          worldBounds[1] = sliceWorldPos;
        } else if (axis === AXIS.J) {
          const yWidth = worldBounds[3] - worldBounds[2];
          sliceWorldPos = worldBounds[2] + yWidth * slice;
          worldBounds[2] = sliceWorldPos;
          worldBounds[3] = sliceWorldPos;
        } else if (axis === AXIS.K) {
          const zWidth = worldBounds[5] - worldBounds[4];
          sliceWorldPos = worldBounds[4] + zWidth * slice;
          worldBounds[4] = sliceWorldPos;
          worldBounds[5] = sliceWorldPos;
        }
        const builtImage = (await image.getImage(
          scale,
          worldBounds,
        )) as BuiltImage;

        if (builtImage.imageType.dimension === 2) {
          return { builtImage, sliceIndex: 0 };
        }
        // buildImage could be larger than slice if cached so
        // find index of slice in builtImage
        const axisIndex = axisToIndex[axis];
        const builtWidthWorld =
          builtImage.spacing[axisIndex] * builtImage.size[axisIndex];
        const sliceInBuildImageWorld =
          sliceWorldPos - builtImage.origin[axisIndex];
        const sliceIndexFloat = Math.round(
          builtImage.size[axisIndex] *
            (sliceInBuildImageWorld / builtWidthWorld),
        );
        // Math.round goes up with .5, so clamp to max index
        const sliceIndex = Math.max(
          0,
          Math.min(sliceIndexFloat, builtImage.size[axisIndex] - 1),
        );
        return { builtImage, sliceIndex };
      },
    ),
    findDefaultAxis: fromPromise(
      async ({
        input: { image },
      }: {
        input: {
          image: MultiscaleSpatialImage;
        };
      }) => {
        const ijkSpacing = await image.scaleSpacing(image.coarsestScale);
        if (ijkSpacing.length > 3) {
          ijkSpacing.push(0);
        }
        const shape = image.scaleInfos[image.coarsestScale].arrayShape;
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

      await image.scaleIndexToWorld(scale); // ??? TODO: this makes reset work...
      const indexToWorld = await image.scaleIndexToWorld(scale);
      const indexBounds = image.getIndexExtent(scale);
      const corners = getCorners(indexBounds);

      // to world space
      const pointsToFit = corners.map((corner) => {
        return vec3.transformMat4(corner, corner, indexToWorld);
      });

      const pose = reset2d(withAxis, verticalFieldOfView, pointsToFit, aspect);

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
        setSlice: {
          actions: [assign({ slice: ({ event }) => event.slice })],
          target: '.buildingImage',
        },
        setScale: {
          actions: [assign({ scale: ({ event }) => event.scale })],
          target: '.buildingImage',
        },
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
        idle: {},
        findingNewImageDefaults: {
          invoke: {
            input: ({ context }) => {
              const { image } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
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
                      type: 'axis',
                      axis: context.axis,
                    });
                  });
                }),
                'resetCameraPose',
              ],
              target: 'buildingImage',
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
        },
      },
    },
  },
});

export type View2dActor = Actor<typeof view2d>;
