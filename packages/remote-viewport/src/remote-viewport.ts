import { createViewport } from '@itk-viewer/viewer/viewport.js';
import { remoteMachine } from './remote-machine.js';
import { fromPromise, interpret } from 'xstate';

type RemoteMachineConfig = {
  actors: {
    connect: ReturnType<typeof fromPromise<any>>;
    renderer: ReturnType<typeof fromPromise<any>>;
  };
};

export const createTestActors: () => RemoteMachineConfig = () => ({
  actors: {
    connect: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return 'aServer';
    }),
    renderer: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { frame: 'new frame here' };
    }),
    updater: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }),
  },
});

const createHyphaRenderer = async (server_url: string) => {
  const config = {
    client_id: 'remote-renderer-test-client',
    name: 'remote_renderer_client',
    server_url,
  };
  const server = await hyphaWebsocketClient.connectToServer(config);
  const renderer = await server.getService('test-agave-renderer-paul');
  await renderer.setup();
  await renderer.setImage('data/aneurism.ome.tif');

  return renderer;
};

export const createHyphaActors: () => RemoteMachineConfig = () => ({
  actors: {
    connect: fromPromise(async ({ input }) =>
      createHyphaRenderer(input.address)
    ),
    renderer: fromPromise(async ({ input: renderer }) => renderer.render()),
    updater: fromPromise(async ({ input: { renderer, density } }) =>
      renderer.setDensity(density)
    ),
  },
});

const createRemote = (config: RemoteMachineConfig) => {
  const hyphaMachine = remoteMachine.provide(config);

  return interpret(hyphaMachine).start();
};

export type RemoteActor = ReturnType<typeof createRemote>;

export const createRemoteViewport = (config: RemoteMachineConfig) => {
  const viewport = createViewport();
  const remote = createRemote(config);

  return { remote, viewport };
};
