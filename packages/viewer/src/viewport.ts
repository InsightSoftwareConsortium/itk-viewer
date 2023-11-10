import { createActor } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

const noop = () => {};

export const createViewport = () => {
  const standAloneViewportLogic = viewportMachine.provide({
    actions: {
      // if not spawned in system, don't error
      forwardToParent: noop,
      sendImageAssigned: noop,
    },
  });
  return createActor(standAloneViewportLogic).start();
};

export type Viewport = ReturnType<typeof createViewport>;
