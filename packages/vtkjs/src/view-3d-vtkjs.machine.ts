import { assign, setup } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera } from '@itk-viewer/viewer/camera.js';
import { ReadonlyMat4 } from 'gl-matrix';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
  camera: Camera | undefined;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view3dLogic = setup({
  types: {} as {
    context: Context;
    events:
      | SetContainerEvent
      | { type: 'imageBuilt'; image: BuiltImage }
      | { type: 'setSlice'; slice: number }
      | { type: 'setCameraPose'; pose: ReadonlyMat4 }
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
    applyCameraPose: (_, __: { pose: ReadonlyMat4 }) => {
      throw new Error('Function not implemented.');
    },
  },
}).createMachine({
  context: () => {
    return {
      rendererContainer: GenericRenderWindow.newInstance({
        listenWindowResize: false,
      }),
      camera: undefined,
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