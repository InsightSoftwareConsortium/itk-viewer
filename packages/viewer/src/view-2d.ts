import { createMachine } from 'xstate';

const context = {};

export const view2d = createMachine({
  types: {} as {
    context: typeof context;
    events: { type: 'setContainer'; container: Element | undefined };
  },
  context: () => JSON.parse(JSON.stringify(context)),
  id: 'view2d',
  initial: 'idle',
  states: {
    idle: { entry: () => console.log('view2d idle') },
  },
});
