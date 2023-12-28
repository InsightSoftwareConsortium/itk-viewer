import { createMachine, sendTo } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import type { Events } from '@itk-viewer/viewer/viewport-machine.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view2dLogic = createMachine({
  types: {} as {
    context: Context;
    events:
      | Events
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
  id: 'view2dVtkjs',
  type: 'parallel',
  states: {
    view2d: {
      invoke: {
        id: 'view2d',
        src: 'view2d',
      },
    },
    vtkjs: {
      entry: [{ type: 'setup' }],
      on: {
        setImage: {
          actions: sendTo('view2d', ({ event }) => event),
        },
        setSlice: {
          actions: sendTo('view2d', ({ event }) => event),
        },
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
