import {
  Actor,
  AnyActorLogic,
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
import { image, Image } from './image.js';
import { CreateChild } from './children.js';
import { Camera, reset3d } from './camera.js';
import { ViewportActor } from './viewport.js';

type Context = {
  spawned: AnyActorRef[];
  scale: number;
  image?: MultiscaleSpatialImage;
  imageActor?: Image;
  viewport?: ViewportActor;
  camera?: Camera;
  autoCameraReset: boolean;
};

export const view3d = setup({
  types: {} as {
    context: Context;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setScale'; scale: number }
      | { type: 'createRenderer'; logic: AnyActorLogic }
      | { type: 'setViewport'; viewport: ViewportActor }
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'setCamera'; camera: Camera }
      | { type: 'setAutoCameraReset'; enableReset: boolean }
      | CreateChild;
  },
  actors: {
    image,
    imageBuilder: fromPromise(
      async ({
        input: { image, scale },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
        };
      }) => {
        const builtImage = await image.getImage(scale);
        return builtImage as BuiltImage;
      },
    ),
  },
  actions: {
    forwardToSpawned: ({ context, event }) => {
      context.spawned.forEach((actor) => {
        actor.send(event);
      });
    },
    resetCameraPose: async ({
      context: { image, camera, viewport, autoCameraReset },
    }) => {
      if (!image || !camera || !autoCameraReset) return;
      const aspect = (() => {
        if (!viewport) return 1;
        const { resolution: dims } = viewport.getSnapshot().context;
        return dims[1] && dims[0] ? dims[0] / dims[1] : 1;
      })();
      const bounds = await image.getWorldBounds(image.coarsestScale);
      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;
      const pose = reset3d(currentPose, verticalFieldOfView, bounds, aspect);

      camera.send({
        type: 'setPose',
        pose,
      });
    },
  },
}).createMachine({
  context: () => ({
    scale: 0,
    spawned: [],
    autoCameraReset: true,
  }),
  id: 'view3d',
  initial: 'active',
  states: {
    active: {
      on: {
        createChild: {
          actions: [
            assign({
              spawned: ({
                spawn,
                context: { spawned, camera, viewport },
                event: { logic, onActor },
              }) => {
                const child = spawn(logic, {
                  input: { viewport },
                }) as AnyActorRef;
                if (camera) child.send({ type: 'setCamera', camera });
                onActor(child);
                return [...spawned, child];
              },
            }),
          ],
        },
        setImage: {
          actions: [
            assign({
              image: ({ event }) => event.image,
              scale: ({ event }) => event.image.coarsestScale,
              imageActor: ({ event, spawn }) =>
                spawn('image', { input: event.image }),
            }),
            'resetCameraPose',
            enqueueActions(({ context, enqueue }) => {
              context.spawned.forEach((actor) => {
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
        setAutoCameraReset: {
          actions: [
            assign({
              autoCameraReset: ({ event: { enableReset } }) => enableReset,
            }),
          ],
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        buildingImage: {
          invoke: {
            input: ({ context }) => {
              const { image, scale } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
                scale,
              };
            },
            src: 'imageBuilder',
            onDone: {
              actions: [
                enqueueActions(({ context, enqueue, event: { output } }) => {
                  context.spawned.forEach((actor) => {
                    enqueue.sendTo(actor, {
                      type: 'imageBuilt',
                      image: output,
                    });
                  });
                  context.imageActor?.send({
                    type: 'builtImage',
                    builtImage: output,
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

export type View3dActor = Actor<typeof view3d>;
