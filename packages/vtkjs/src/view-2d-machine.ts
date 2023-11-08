import { createMachine } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const machine = createMachine({
  types: {} as {
    context: Context;
    events: SetContainerEvent;
    actions:
      | { type: 'setup'; context: Context }
      | { type: 'setContainer'; event: SetContainerEvent };
  },
  context: () => {
    return {
      rendererContainer: GenericRenderWindow.newInstance({
        listenWindowResize: false,
      }),
    };
  },
  id: 'view2d',
  type: 'parallel',
  states: {
    view2d: {
      id: 'view2d',
      invoke: {
        src: 'view2d',
      },
    },
    vtkjs: {
      entry: [{ type: 'setup' }],
      on: {
        setContainer: {
          actions: [{ type: 'setContainer' }],
        },
      },
    },
  },
});
