import { assign, createMachine, sendParent } from 'xstate';

import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera } from './camera-machine.js';
import { ReadonlyMat4, vec3 } from 'gl-matrix';

type Context = {
  image?: MultiscaleSpatialImage;
  camera?: Camera;
  cameraSubscription?: ReturnType<Camera['subscribe']>;
  resolution: [number, number];
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

type Events =
  | SetImageEvent
  | SetCameraEvent
  | CameraPoseUpdatedEvent
  | { type: 'setResolution'; resolution: [number, number] };

export const viewportMachine = createMachine(
  {
    types: {} as {
      context: Context;
      events: Events;
    },
    id: 'viewport',
    initial: 'active',
    context: {
      image: undefined,
      camera: undefined,
      cameraSubscription: undefined,
      resolution: [0, 0],
    },
    states: {
      active: {
        on: {
          setImage: {
            actions: [
              assign({
                image: ({ event: { image } }: { event: SetImageEvent }) =>
                  image,
              }),
              'forwardToParent',
              'resetCameraPose',
            ],
          },
          setCamera: {
            actions: [
              assign({
                camera: ({ event: { camera } }: { event: SetCameraEvent }) =>
                  camera,
              }),
              'resetCameraPose',
              ({ context, self }) => {
                if (context.cameraSubscription)
                  context.cameraSubscription.unsubscribe();

                // Let observers of Viewport know that camera has updated
                context.cameraSubscription = context.camera?.subscribe(
                  (cameraState) => {
                    self.send({
                      type: 'cameraPoseUpdated',
                      pose: cameraState.context.pose,
                    });
                  },
                );
              },
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
  },
  {
    actions: {
      forwardToParent: sendParent(({ event }) => {
        return event;
      }),
      resetCameraPose: async ({ context: { image, camera } }) => {
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
  },
);
