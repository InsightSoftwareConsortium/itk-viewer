import { createActor } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

export const createViewport = () => {
  return createActor(viewportMachine).start();
};

export type Viewport = ReturnType<typeof createViewport>;
