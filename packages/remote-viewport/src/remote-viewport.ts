import { fromPromise, interpret } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { Viewport, createViewport } from '@itk-viewer/viewer/viewport.js';
import { RendererEntries, remoteMachine } from './remote-machine.js';
import { mat4, vec3 } from 'gl-matrix';

export type RemoteMachineActors = {
  actors: {
    connect: ReturnType<typeof fromPromise<unknown>>;
    renderer: ReturnType<typeof fromPromise<string>>;
  };
};

const createHyphaRenderer = async (server_url: string) => {
  const config = {
    client_id: 'remote-renderer-test-client',
    name: 'remote_renderer_client',
    server_url,
  };
  const server = await hyphaWebsocketClient.connectToServer(config);
  const renderer = await server.getService('test-agave-renderer');
  await renderer.setup();
  await renderer.setImage('data/aneurism.ome.tif');
  return renderer;
};

export const createHyphaActors: () => RemoteMachineActors = () => ({
  actors: {
    connect: fromPromise(async ({ input }) =>
      createHyphaRenderer(input.address)
    ),
    renderer: fromPromise(
      async ({
        input: { server, events },
      }: {
        input: {
          server: { updateRenderer: (events: unknown) => Promise<string> };
          events: RendererEntries;
        };
      }) => {
        const translatedEvents = events.map(([key, value]) => {
          if (key === 'cameraPose') {
            const eye = vec3.create();
            mat4.getTranslation(eye, value);

            const target = vec3.fromValues(value[8], value[9], value[10]);
            vec3.subtract(target, eye, target);

            const up = vec3.fromValues(value[4], value[5], value[6]);

            return ['cameraPose', { eye, up, target }];
          }
          return [key, value];
        });
        return server.updateRenderer(translatedEvents);
      }
    ),
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
