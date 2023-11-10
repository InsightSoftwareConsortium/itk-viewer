import { createMachine, sendTo } from 'xstate';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import type { Events } from '@itk-viewer/viewer/viewport-machine.js';

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
    events: Events | SetContainerEvent;
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
        setContainer: {
          actions: [{ type: 'setContainer' }],
        },
      },
    },
  },
});
