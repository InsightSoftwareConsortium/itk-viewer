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
import { CreateChild } from './children.js';
import { Camera, reset2d } from './camera.js';
import { ViewportActor } from './viewport.js';
import { quat, vec3 } from 'gl-matrix';

const viewContext = {
  slice: 0.5,
  scale: 0,
  image: undefined as MultiscaleSpatialImage | undefined,
  spawned: {} as Record<string, AnyActorRef>,
  viewport: undefined as ViewportActor | undefined,
  camera: undefined as Camera | undefined,
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
        input: { image, scale, slice },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
          slice: number;
        };
      }) => {
        const worldBounds = await image.getWorldBounds(scale);
        const zWidth = worldBounds[5] - worldBounds[4];
        const worldZ = worldBounds[4] + zWidth * slice;
        worldBounds[4] = worldZ;
        worldBounds[5] = worldZ;
        const builtImage = (await image.getImage(
          scale,
          worldBounds,
        )) as BuiltImage;

        if (builtImage.imageType.dimension === 2) {
          return { builtImage, sliceIndex: 0 };
        }
        // buildImage could be larger than slice if cached so
        // find index of slice in builtImage
        const builtWidthWorld = builtImage.spacing[2] * builtImage.size[2];
        const sliceInBuildImageWorld = worldZ - builtImage.origin[2];
        const sliceIndexFloat = Math.round(
          builtImage.size[2] * (sliceInBuildImageWorld / builtWidthWorld),
        );
        // Math.round goes up with .5, so we need to clamp to max index
        const sliceIndex = Math.min(sliceIndexFloat, builtImage.size[2] - 1);
        return { builtImage, sliceIndex };
      },
    ),
  },
  actions: {
    forwardToSpawned: ({ context, event }) => {
      Object.values(context.spawned).forEach((actor) => {
        actor.send(event);
      });
    },
    resetCameraPose: async ({ context: { image, camera, viewport } }) => {
      if (!image || !camera) return;
      const aspect = (() => {
        if (!viewport) return 1;
        const { resolution: dims } = viewport.getSnapshot().context;
        return dims[1] && dims[0] ? dims[0] / dims[1] : 1;
      })();

      const bounds = await image.getWorldBounds(image.coarsestScale);
      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;
      // rotate so to look down -Z with +Y down on screen
      const withAxis = { ...currentPose };
      const axis = vec3.fromValues(1, 0, 0);
      const rotation = quat.create();
      quat.setAxisAngle(rotation, axis, Math.PI);
      withAxis.rotation = rotation;
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
                context: { spawned, camera },
                event: { logic, onActor },
                self,
              }) => {
                // @ts-expect-error cannot spawn actor of type that is not in setup()
                const child = spawn(logic, { input: { parent: self } });
                if (camera) child.send({ type: 'setCamera', camera });
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
            'resetCameraPose',
            enqueueActions(({ context, enqueue }) => {
              Object.values(context.spawned).forEach((actor) => {
                enqueue.sendTo(actor, {
                  type: 'setImage',
                  image: context.image,
                });
              });
            }),
          ],
          target: '.buildingImage',
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
        buildingImage: {
          invoke: {
            input: ({ context }) => {
              const { image, scale, slice } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
                scale,
                slice,
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
