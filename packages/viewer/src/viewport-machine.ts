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

type SetCameraPoseEvent = {
  type: 'setCameraPose';
  pose: ReadonlyMat4;
};

export const viewportMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetImageEvent | SetCameraEvent | SetCameraPoseEvent;
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
              context.cameraSubscription = context.camera?.subscribe(
                (state) => {
                  (self as ActorRef<SetCameraEvent | SetCameraPoseEvent>).send({
                    type: 'setCameraPose',
                    pose: state.context.pose,
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
