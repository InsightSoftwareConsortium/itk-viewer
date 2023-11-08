import { createMachine } from 'xstate';

const context = {};

export const view2d = createMachine({
  types: {} as {
    context: typeof context;
  },
  context: () => JSON.parse(JSON.stringify(context)),
  id: 'view2d',
  initial: 'idle',
  states: {
    idle: {},
  },
});
