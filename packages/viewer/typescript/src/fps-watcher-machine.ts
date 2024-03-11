import { assign, createMachine, sendParent } from 'xstate';

const DEBUG = Boolean(import.meta.env.VITE_DEBUG ?? false);

const SAMPLE_SIZE = 30;

const SLOW_FPS = 15;
const FAST_FPS = 30;
const SLOW_FRAME_TIME = 1 / SLOW_FPS;
const FAST_FRAME_TIME = 1 / FAST_FPS;

const context = {
  samples: [] as Array<number>,
  average: 0,
};

export const fpsWatcher = createMachine(
  {
    types: {} as {
      context: typeof context;
      events: { type: 'newSample'; renderTime: number };
    },
    context,
    id: 'fpsWatcher',
    initial: 'sample',
    states: {
      sample: {
        always: [{ target: 'judge', guard: 'checkEnoughSamples' }],
        on: {
          newSample: [
            {
              actions: [
                assign({
                  samples: ({
                    event: { renderTime },
                    context: { samples },
                  }) => [...samples, renderTime],
                }),
              ],
              target: 'sample',
            },
          ],
        },
      },
      judge: {
        entry: [
          assign({
            average: ({ context: { samples } }) => {
              const average = samples.reduce((a, b) => a + b) / samples.length;
              if (DEBUG) console.log('FPS Watcher Average:', average);
              return average;
            },
          }),
        ],
        always: [
          { guard: 'checkSlow', target: 'slow' },
          { guard: 'checkFast', target: 'fast' },
          { target: 'sample' },
        ],
        exit: assign({
          samples: () => [],
        }),
      },
      slow: {
        entry: [sendParent({ type: 'slowFps' })],
        always: { target: 'sample' },
      },
      fast: {
        entry: [sendParent({ type: 'fastFps' })],
        always: { target: 'sample' },
      },
    },
  },
  {
    guards: {
      checkEnoughSamples: ({ context: { samples } }) =>
        samples.length >= SAMPLE_SIZE,
      checkSlow: ({ context: { average } }) => average > SLOW_FRAME_TIME,
      checkFast: ({ context: { average } }) => average < FAST_FRAME_TIME,
    },
  },
);
