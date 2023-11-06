import { createMachine } from 'xstate';

const context = {
  samples: [] as Array<number>,
  average: 0,
};

export const view2d = createMachine({
  types: {} as {
    context: typeof context;
    events: { type: 'newSample'; renderTime: number };
  },
  context: () => JSON.parse(JSON.stringify(context)),
  id: 'view2d',
  initial: 'idle',
  states: {
    idle: {},
  },
});
