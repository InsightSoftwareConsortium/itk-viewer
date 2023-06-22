import { interpret } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

export const createViewport = () => {
  return interpret(viewportMachine).start();
};

export type Viewport = ReturnType<typeof createViewport>;
