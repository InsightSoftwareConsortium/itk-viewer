import { createMachine } from 'xstate';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';

export type Context = {
  rendererContainer: vtkGenericRenderWindow | undefined;
};

const context = {
  rendererContainer: undefined,
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const machine = createMachine({
  types: {} as {
    context: typeof context;
    events: SetContainerEvent;
    actions:
      | { type: 'setup'; context: typeof context }
      | { type: 'setContainer'; event: SetContainerEvent };
  },
  context: () => JSON.parse(JSON.stringify(context)),
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
