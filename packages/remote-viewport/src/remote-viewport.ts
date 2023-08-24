import { fromPromise, interpret } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { mat4, vec3 } from 'gl-matrix';
//@ts-expect-error .d.ts file not resolved
import { decode } from '@itk-wasm/htj2k';
import { Viewport, createViewport } from '@itk-viewer/viewer/viewport.js';
import { RendererEntries, remoteMachine, Context } from './remote-machine.js';
import { RenderedFrame } from './types.js';

type Renderer = {
  updateRenderer: (events: unknown) => unknown;
  loadImage: (image: string | undefined) => void;
  render: () => Promise<{ frame: ArrayBuffer; renderTime: number }>;
};

export type RemoteMachineActors = {
  actors: {
    connect: ReturnType<typeof fromPromise<unknown>>;
    renderer: ReturnType<typeof fromPromise<RenderedFrame>>;
  };
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
    actors: {
      connect: fromPromise(async ({ input }) =>
        createHyphaRenderer(input.context)
      ),
      renderer: fromPromise(
        async ({
          input: { server, events },
        }: {
          input: {
            server: Renderer;
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

              if (key === 'image') {
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
            encodedImage
          );
          decodeWorker = webWorker;

          return { frame, renderTime };
        }
      ),
    },
  };
};

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
