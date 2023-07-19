import { createViewport } from '@itk-viewer/viewer/viewport.js';
import { remoteMachine } from './remote-machine.js';
import { fromPromise, interpret } from 'xstate';

type RemoteConfig = {
  actors: {
    connect: ReturnType<typeof fromPromise<any>>;
    renderer: ReturnType<typeof fromPromise<any>>;
  };
};

export const createTestActors: () => RemoteConfig = () => ({
  actors: {
    connect: fromPromise(async ({ input }) => {
      console.log('connecting...', input.address);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // return { server: 'asdf' };
      return 'aServer';
    }),
    renderer: fromPromise(async ({ input }) => {
      console.log('render', input);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { frame: 'new frame here' };
    }),
  },
});

const createRemote = (config: RemoteConfig) => {
  const hyphaMachine = remoteMachine.provide(config);

  return interpret(hyphaMachine).start();
};

export type RemoteActor = ReturnType<typeof createRemote>;

export const createRemoteViewport = (config: RemoteConfig) => {
  const viewport = createViewport();
  const remote = createRemote(config);

  return { remote, viewport };
};
