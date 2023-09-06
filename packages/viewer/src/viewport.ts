import { createActor } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

const noop = () => {};

export const createViewport = () => {
  const standAloneViewportLogic = viewportMachine.provide({
    actions: {
      forwardToParent: noop, // if not spawned in system, don't error
    },
  });
  return createActor(standAloneViewportLogic).start();
};

export type Viewport = ReturnType<typeof createViewport>;
