import { createActor, fromPromise } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { mat4, vec3 } from 'gl-matrix';
import { decode, Image } from '@itk-wasm/htj2k';
import { RendererEntries, remoteMachine, Context } from './remote-machine.js';

export type { Image } from '@itk-wasm/htj2k';

type RenderedFrame = {
  frame: Image;
  renderTime: number;
};

type Renderer = {
  updateRenderer: (events: unknown) => unknown;
  loadImage: (image: string | undefined) => void;
  render: () => Promise<{ frame: Uint8Array; renderTime: number }>;
};

type RendererInput = {
  server: Renderer;
  events: RendererEntries;
};

type ConnectInput = { context: Context };

export type RemoteMachineActors = {
  connect: ReturnType<typeof fromPromise<unknown, ConnectInput>>;
  renderer: ReturnType<typeof fromPromise<RenderedFrame, RendererInput>>;
};

type HyphaServiceConfig = {
  serverUrl: string;
  serviceId: string;
};

const createHyphaRenderer = async (context: Context) => {
  const { serverUrl, serviceId } = context.serverConfig as HyphaServiceConfig;
  if (!serverUrl) {
    throw new Error('No server url provided');
  }

  const config = {
    client_id: 'remote-renderer-test-client',
    name: 'remote_renderer_client',
    server_url: serverUrl,
  };
  const hypha = await hyphaWebsocketClient.connectToServer(config);
  const renderer = await hypha.getService(serviceId);
  await renderer.setup();

  return renderer;
};

export const createHyphaActors: () => RemoteMachineActors = () => {
  let decodeWorker: Worker | null = null;

  return {
    connect: fromPromise(async ({ input }: { input: ConnectInput }) =>
      createHyphaRenderer(input.context),
    ),
    renderer: fromPromise(
      async ({ input: { server, events } }: { input: RendererInput }) => {
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

            if (key === 'image') {
              console.log('loading image', value);
              server.loadImage(value);
              return;
            }

            return [key, value];
          })
          .filter(Boolean);

        server.updateRenderer(translatedEvents);
        const { frame: encodedImage, renderTime } = await server.render();
        const { image: frame, webWorker } = await decode(
          decodeWorker,
          encodedImage,
        );
        decodeWorker = webWorker;

        return { frame, renderTime };
      },
    ),
  };
};

export type RemoteMachineOptions = {
  actors: RemoteMachineActors;
};

const createRemote = (config: RemoteMachineOptions) => {
  const remoteActor = remoteMachine.provide(config);

  return createActor(remoteActor).start();
};

export type RemoteActor = ReturnType<typeof createRemote>;

export const createRemoteViewport = (actors: RemoteMachineActors) => {
  const config = {
    actors,
  };
  const remote = createRemote(config);
  const viewport = remote.getSnapshot().context.viewport;

  return { remote, viewport };
};
