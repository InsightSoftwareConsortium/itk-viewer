import { ActorRef, assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera } from './camera-machine.js';
import { ReadonlyMat4 } from 'gl-matrix';

type Context = {
  image: MultiscaleSpatialImage | undefined;
  camera?: Camera;
  cameraSubscription?: ReturnType<Camera['subscribe']>;
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

export const viewportMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetImageEvent | SetCameraEvent | CameraPoseUpdatedEvent;
  },
  id: 'viewport',
  initial: 'active',
  context: {
    image: undefined,
    camera: undefined,
    cameraSubscription: undefined,
  },
  states: {
    active: {
      on: {
        setImage: {
          actions: [
            assign({
              image: ({ event: { image } }: { event: SetImageEvent }) => image,
            }),
          ],
        },
        setCamera: {
          actions: [
            assign({
              camera: ({ event: { camera } }: { event: SetCameraEvent }) =>
                camera,
            }),
            ({ context, self }) => {
              if (context.cameraSubscription)
                context.cameraSubscription.unsubscribe();

              // Let observers of Viewport know that camera has updated
              context.cameraSubscription = context.camera?.subscribe(
                (cameraState) => {
                  (
                    self as ActorRef<SetCameraEvent | CameraPoseUpdatedEvent>
                  ).send({
                    type: 'cameraPoseUpdated',
                    pose: cameraState.context.pose,
                  });
                }
              );
            },
          ],
        },
      },
    },
  },
});
