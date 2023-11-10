import { createMachine, sendTo } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

const context = {};

export const view2d = createMachine(
  {
    types: {} as {
      context: typeof context;
    },
    context: () => JSON.parse(JSON.stringify(context)),
    id: 'view2d',
    type: 'parallel',
    states: {
      viewport: {
        invoke: {
          id: 'viewport',
          src: 'viewport',
        },
      },
      view2d: {
        on: {
          setImage: {
            actions: [sendTo('viewport', ({ event }) => event)],
          },
          imageAssigned: {
            actions: [({ event }) => console.log(event)],
          },
        },
      },
    },
  },
  {
    actors: {
      viewport: viewportMachine,
    },
  },
);
