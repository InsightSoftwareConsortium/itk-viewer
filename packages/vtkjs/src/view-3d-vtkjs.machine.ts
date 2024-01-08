import { createMachine } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view3dLogic = createMachine({
  types: {} as {
    context: Context;
    events:
      | SetContainerEvent
      | { type: 'imageBuilt'; image: BuiltImage }
      | { type: 'setSlice'; slice: number };
    actions:
      | { type: 'setup'; context: Context }
      | { type: 'setContainer'; event: SetContainerEvent }
      | { type: 'imageBuilt'; image: BuiltImage };
  },
  context: () => {
    return {
      rendererContainer: GenericRenderWindow.newInstance({
        listenWindowResize: false,
      }),
    };
  },
  id: 'view3dVtkjs',
  initial: 'vtkjs',
  states: {
    vtkjs: {
      entry: [{ type: 'setup' }],
      on: {
        setContainer: {
          actions: [{ type: 'setContainer' }],
        },
        imageBuilt: {
          actions: [{ type: 'imageBuilt' }],
        },
      },
    },
  },
});
