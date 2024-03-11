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
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ValueOf } from '@itk-viewer/io/types.js';
import { ReadonlyBounds } from '@itk-viewer/utils/bounding-box.js';
import { CreateChild } from './children.js';
import { Camera, reset2d } from './camera.js';
import { ViewportActor } from './viewport.js';
import { quat, vec3 } from 'gl-matrix';

export const AXIS = {
  X: 'x',
  Y: 'y',
  Z: 'z',
} as const;

export type Axis = ValueOf<typeof AXIS>;

const axisToIndex = {
  x: 0,
  y: 1,
  z: 2,
} as const;

const viewContext = {
  slice: 0.5,
  axis: AXIS.Z as Axis,
  scale: 0,
  image: undefined as MultiscaleSpatialImage | undefined,
  spawned: {} as Record<string, AnyActorRef>,
  viewport: undefined as ViewportActor | undefined,
  camera: undefined as Camera | undefined,
};

const toRotation = (axis: Axis) => {
  // Default to z axis where +Z goes into screen and +Y is down on screen
  let vec = vec3.fromValues(1, 0, 0);
  let angle = Math.PI;
  if (axis == 'x') {
    vec = vec3.fromValues(0, 1, 0);
    angle = Math.PI / 2;
  } else if (axis == 'y') {
    angle = Math.PI / 2;
  }
  const rotation = quat.create();
  quat.setAxisAngle(rotation, vec, angle);
  return rotation;
};

const computeMinSizeAxis = (bounds: ReadonlyBounds) => {
  const xSize = Math.abs(bounds[1] - bounds[0]);
  const ySize = Math.abs(bounds[3] - bounds[2]);
  const zSize = Math.abs(bounds[5] - bounds[4]);
  if (xSize < ySize && xSize < zSize) {
    return AXIS.X;
  }
  if (ySize < xSize && ySize < zSize) {
    return AXIS.Y;
  }
  return AXIS.Z;
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
        if (axis === 'x') {
          const xWidth = worldBounds[1] - worldBounds[0];
          sliceWorldPos = worldBounds[0] + xWidth * slice; // world X pos
          worldBounds[0] = sliceWorldPos;
          worldBounds[1] = sliceWorldPos;
        } else if (axis === 'y') {
          const yWidth = worldBounds[3] - worldBounds[2];
          sliceWorldPos = worldBounds[2] + yWidth * slice;
          worldBounds[2] = sliceWorldPos;
          worldBounds[3] = sliceWorldPos;
        } else if (axis === 'z') {
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
        // Math.round goes up with .5, so we need to clamp to max index
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
        const worldBounds = await image.getWorldBounds(image.coarsestScale);
        return computeMinSizeAxis(worldBounds);
      },
    ),
  },
  actions: {
    forwardToSpawned: ({ context, event }) => {
      Object.values(context.spawned).forEach((actor) => {
        actor.send(event);
      });
    },
    resetCameraPose: async ({ context: { image, camera, viewport, axis } }) => {
      if (!image || !camera) return;
      const aspect = (() => {
        if (!viewport) return 1;
        const { resolution: dims } = viewport.getSnapshot().context;
        return dims[1] && dims[0] ? dims[0] / dims[1] : 1;
      })();

      const bounds = await image.getWorldBounds(image.coarsestScale);

      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;
      const withAxis = { ...currentPose };

      withAxis.rotation = toRotation(axis);

      const pose = reset2d(withAxis, verticalFieldOfView, bounds, aspect);
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
