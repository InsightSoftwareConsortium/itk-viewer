import { fromPromise, interpret } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { Viewport, createViewport } from '@itk-viewer/viewer/viewport.js';
import { RendererEntries, remoteMachine, Context } from './remote-machine.js';
import { mat4, vec3 } from 'gl-matrix';

export type RemoteMachineActors = {
  actors: {
    connect: ReturnType<typeof fromPromise<unknown>>;
    renderer: ReturnType<typeof fromPromise<ArrayBuffer>>;
  };
};

const createHyphaRenderer = async (context: Context) => {
  const {
    address: server_url,
    rendererProps: { imageFile },
  } = context;
  if (!server_url) {
    throw new Error('No server url provided');
  }

  const config = {
    client_id: 'remote-renderer-test-client',
    name: 'remote_renderer_client',
    server_url,
  };
  const hypha = await hyphaWebsocketClient.connectToServer(config);
  const renderer = await hypha.getService('test-agave-renderer');
  await renderer.setup();
  await renderer.loadImage(imageFile);

  return renderer;
};

export const createHyphaActors: () => RemoteMachineActors = () => ({
  actors: {
    connect: fromPromise(async ({ input }) =>
      createHyphaRenderer(input.context)
    ),
    renderer: fromPromise(
      async ({
        input: { server, events },
      }: {
        input: {
          server: {
            updateRenderer: (events: unknown) => Promise<ArrayBuffer>;
            loadImage: (image: string | undefined) => void;
            render: () => Promise<ArrayBuffer>;
          };
          events: RendererEntries;
        };
      }) => {
        const translatedEvents = events
          .map(([key, value]) => {
            if (key === 'cameraPose') {
              const eye = vec3.create();
              mat4.getTranslation(eye, value);

              const target = vec3.fromValues(value[8], value[9], value[10]);
              vec3.subtract(target, eye, target);

              const up = vec3.fromValues(value[4], value[5], value[6]);

              return ['cameraPose', { eye, up, target }];
            }

            if (key === 'imageFile') {
              server.loadImage(value);
              return;
            }

            return [key, value];
          })
          .filter(Boolean);

        server.updateRenderer(translatedEvents);
        return server.render();
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
