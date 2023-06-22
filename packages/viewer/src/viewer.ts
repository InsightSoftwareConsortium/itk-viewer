import { interpret } from 'xstate';

import { viewerMachine } from './viewer-machine.js';

export const createViewer = () => {
  return interpret(viewerMachine).start();
};

export type Viewer = ReturnType<typeof createViewer>;
