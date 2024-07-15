import { assign, setup, Subscription } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera, ReadonlyPose } from '@itk-viewer/viewer/camera.js';
import { ViewportActor } from '@itk-viewer/viewer/viewport.js';
import { Image, ImageSnapshot } from '@itk-viewer/viewer/image.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
  camera: Camera | undefined;
  viewport: ViewportActor;
  imageSubscription?: Subscription;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view3dLogic = setup({
  types: {} as {
    input: { viewport: ViewportActor };
    context: Context;
    events:
      | SetContainerEvent
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'imageBuilt'; image: BuiltImage }
      | { type: 'setImageActor'; image: Image }
      | { type: 'imageSnapshot'; state: ImageSnapshot }
      | { type: 'setSlice'; slice: number }
      | { type: 'setCameraPose'; pose: ReadonlyPose }
      | { type: 'setCamera'; camera: Camera };
  },
  actions: {
    setContainer: () => {
      throw new Error('Function not implemented.');
    },
    imageBuilt: () => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imageSnapshot: (_, __: ImageSnapshot) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyCameraPose: (_, __: { pose: ReadonlyPose }) => {
      throw new Error('Function not implemented.');
    },
    forwardResolution: (
      _,
      {
        viewport,
        resolution,
      }: { viewport: ViewportActor; resolution: [number, number] },
    ) => {
      viewport.send({ type: 'setResolution', resolution });
    },
  },
}).createMachine({
  context: ({ input: { viewport } }) => {
    return {
      rendererContainer: GenericRenderWindow.newInstance({
        listenWindowResize: false,
      }),
      camera: undefined,
      viewport,
    };
  },
  id: 'view3dVtkjs',
  initial: 'active',
  states: {
    active: {
      on: {
        setContainer: {
          actions: [{ type: 'setContainer' }],
        },
        setResolution: {
          actions: [
            {
              type: 'forwardResolution',
              params: ({ event: { resolution }, context: { viewport } }) => ({
                viewport,
                resolution,
              }),
            },
          ],
        },
        imageBuilt: {
          actions: [{ type: 'imageBuilt' }],
        },
        setImageActor: {
          actions: [
            ({ context }) => {
              context.imageSubscription?.unsubscribe();
            },
            assign({
              imageSubscription: ({ event: { image }, self }) =>
                image.subscribe((state) =>
                  self.send({ type: 'imageSnapshot', state }),
                ),
            }),
          ],
        },
        imageSnapshot: {
          actions: [
            { type: 'imageSnapshot', params: ({ event }) => event.state },
          ],
        },
        setCamera: {
          actions: [
            ({ context, self }) => {
              context.camera?.send({ type: 'watchPoseStop', watcher: self });
            },
            assign({
              camera: ({ event: { camera } }) => camera,
            }),
            ({ event, self }) => {
              event.camera.send({ type: 'watchPose', watcher: self });
            },
          ],
        },
        setCameraPose: {
          actions: [
            {
              type: 'applyCameraPose',
              params: ({ event }) => ({ pose: event.pose }),
            },
          ],
        },
      },
    },
  },
});
