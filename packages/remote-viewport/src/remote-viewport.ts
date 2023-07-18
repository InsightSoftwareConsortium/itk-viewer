import { createViewport } from '@itk-viewer/viewer/viewport.js';
import { remoteMachine } from './remote-machine.js';
import { interpret } from 'xstate';

const createRemote = () => interpret(remoteMachine).start();

export type Remote = ReturnType<typeof createRemote>;

export const createRemoteViewport = () => {
  const viewport = createViewport();
  const remote = createRemote();

  return { remote, viewport };
};
