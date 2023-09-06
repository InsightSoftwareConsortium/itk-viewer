import { createActor } from 'xstate';

import { viewerMachine } from './viewer-machine.js';

export const createViewer = () => {
  return createActor(viewerMachine).start();
};

export type Viewer = ReturnType<typeof createViewer>;
