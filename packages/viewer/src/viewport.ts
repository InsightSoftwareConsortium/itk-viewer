import { Actor, AnyActorRef, assign, sendParent, setup } from 'xstate';
import { ReadonlyMat4 } from 'gl-matrix';

import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { cameraMachine, Camera, reset3d } from './camera.js';
import { CreateChild } from './children.js';

type Context = {
  image?: MultiscaleSpatialImage;
  camera: Camera;
  resolution: [number, number];
  spawned: Record<string, AnyActorRef>;
};

type SetImageEvent = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
};

type SetCameraEvent = {
  type: 'setCamera';
  camera: Camera;
};

type CameraPoseUpdatedEvent = {
  type: 'cameraPoseUpdated';
  pose: ReadonlyMat4;
};

export type Events =
  | SetImageEvent
  | SetCameraEvent
  | CameraPoseUpdatedEvent
  | { type: 'setResolution'; resolution: [number, number] }
  | CreateChild;

export const viewportMachine = setup({
  types: {} as {
    context: Context;
    events: Events;
  },
  actions: {
    forwardToParent: sendParent(({ event }) => {
      return event;
    }),
    forwardToSpawned: ({ context, event }) => {
      Object.values(context.spawned).forEach((actor) => {
        actor.send(event);
      });
    },
    resetCameraPose: async ({ context: { image }, self }) => {
      const { camera } = self.getSnapshot().children;
      if (!image || !camera) return;

      const bounds = await image.getWorldBounds(image.coarsestScale);
      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;
      const lookAt = reset3d(currentPose, verticalFieldOfView, bounds);

      camera.send({
        type: 'lookAt',
        lookAt,
      });
    },
  },
}).createMachine({
  id: 'viewport',
  context: ({ spawn }) => ({
    resolution: [0, 0],
    spawned: {},
    camera: spawn(cameraMachine, { id: 'camera' }),
  }),
  initial: 'active',
  states: {
    active: {
      on: {
        createChild: {
          actions: [
            assign({
              spawned: ({
                spawn,
                context: { spawned },
                event: { logic, onActor },
                self,
              }) => {
                const child = spawn(logic);
                child.send({ type: 'setViewport', viewport: self });
                const { camera } = self.getSnapshot().children;
                child.send({ type: 'setCamera', camera });
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
              image: ({ event: { image } }: { event: SetImageEvent }) => image,
            }),
            'resetCameraPose',
            'forwardToSpawned',
          ],
        },
        setCamera: {
          actions: [
            assign({
              camera: ({ event: { camera } }: { event: SetCameraEvent }) =>
                camera,
            }),
            'resetCameraPose',
            'forwardToSpawned',
          ],
        },
        setResolution: {
          actions: [
            assign({
              resolution: ({ event: { resolution } }) => resolution,
            }),
            'forwardToParent',
          ],
        },
      },
    },
  },
});

export type ViewportActor = Actor<typeof viewportMachine>;
