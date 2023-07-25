import { fromPromise, interpret } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { Viewport, createViewport } from '@itk-viewer/viewer/viewport.js';
import { remoteMachine } from './remote-machine.js';

export type RemoteMachineActors = {
  actors: {
    connect: ReturnType<typeof fromPromise<any>>;
    renderer: ReturnType<typeof fromPromise<any>>;
  };
};

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

export const createHyphaActors: () => RemoteMachineActors = () => ({
  actors: {
    connect: fromPromise(async ({ input }) =>
      createHyphaRenderer(input.address)
    ),
    renderer: fromPromise(async ({ input: renderer }) => renderer.render()),
    updater: fromPromise(async ({ input: { renderer, density, camera } }) => {
      renderer.setDensity(density);

      console.log({ density, camera });
      // renderer.updateParameters({ density, cameraPose: camera.pose });
    }),
  },
});

export type RemoteMachineOptions = {
  context: {
    viewport: Viewport;
  };
} & RemoteMachineActors;

const createRemote = (config: RemoteMachineOptions) => {
  const remoteActor = remoteMachine.provide(config);

  return interpret(remoteActor, {
    input: config.context,
  }).start();
};

export type RemoteActor = ReturnType<typeof createRemote>;

export const createRemoteViewport = (config: RemoteMachineActors) => {
  const viewport = createViewport();
  const configWithViewport = {
    ...config,
    context: {
      viewport,
    },
  };
  const remote = createRemote(configWithViewport);

  return { remote, viewport };
};
