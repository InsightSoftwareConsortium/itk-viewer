import { Actor, AnyActorRef, assign, sendParent, setup } from 'xstate';
import { ReadonlyMat4, vec3 } from 'gl-matrix';

import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { cameraMachine, Camera } from './camera.js';
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
    sendImage: ({ context }) => {
      Object.values(context.spawned).forEach((actor) => {
        actor.send({ type: 'setImage', image: context.image });
      });
    },
    resetCameraPose: async ({ context: { image }, self }) => {
      const { camera } = self.getSnapshot().children;
      if (!image || !camera) return;

      const { pose: currentPose, verticalFieldOfView } =
        camera.getSnapshot().context;

      const bounds = await image.getWorldBounds(image.coarsestScale);

      const center = vec3.fromValues(
        (bounds[0] + bounds[1]) / 2.0,
        (bounds[2] + bounds[3]) / 2.0,
        (bounds[4] + bounds[5]) / 2.0,
      );

      let w1 = bounds[1] - bounds[0];
      let w2 = bounds[3] - bounds[2];
      let w3 = bounds[5] - bounds[4];
      w1 *= w1;
      w2 *= w2;
      w3 *= w3;
      let radius = w1 + w2 + w3;
      // If we have just a single point, pick a radius of 1.0
      radius = radius === 0 ? 1.0 : radius;
      // compute the radius of the enclosing sphere
      radius = Math.sqrt(radius) * 0.5;

      const angle = verticalFieldOfView * (Math.PI / 180); // to radians
      const distance = radius / Math.sin(angle * 0.5);

      const forward = [currentPose[8], currentPose[9], currentPose[10]];
      const up = vec3.fromValues(
        currentPose[4],
        currentPose[5],
        currentPose[6],
      );

      const eye = vec3.fromValues(
        center[0] + distance * forward[0],
        center[1] + distance * forward[1],
        center[2] + distance * forward[2],
      );

      camera.send({
        type: 'lookAt',
        lookAt: { eye, center: center, up },
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
  type: 'parallel',
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
            'sendImage',
            'resetCameraPose',
          ],
        },
        setCamera: {
          actions: [
            assign({
              camera: ({ event: { camera } }: { event: SetCameraEvent }) =>
                camera,
            }),
            'forwardToSpawned',
            'resetCameraPose',
          ],
        },
        cameraPoseUpdated: {
          actions: ['forwardToParent'],
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
