import { assign, setup } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera, ReadonlyPose } from '@itk-viewer/viewer/camera.js';
import { ViewportActor } from '@itk-viewer/viewer/viewport.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
  camera: Camera | undefined;
  viewport: ViewportActor;
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
  initial: 'vtkjs',
  states: {
    vtkjs: {
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
