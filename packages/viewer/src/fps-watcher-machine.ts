import { createMachine } from 'xstate';

export const fpsWatcher = createMachine({
  types: {} as {
    context: { currentScale: number; scaleCount: number };
    events: { type: 'newSample'; fps: number };
  },
  id: 'fpsWatcher',
  initial: 'active',
  context: { currentScale: 0, scaleCount: 3 },
  states: {
    active: {
      on: {
        newSample: {
          actions: [({ event: { fps } }) => console.log('newSample', fps)],
        },
      },
    },
  },
});
