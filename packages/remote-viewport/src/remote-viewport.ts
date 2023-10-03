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
  render: () => Promise<{ frame: Uint8Array; renderTime: number }>;
};

type MachineContext = Omit<Context, 'server'> & { server: Renderer };

type RendererInput = {
  context: MachineContext;
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

export const createHyphaMachineConfig: () => RemoteMachineOptions = () => {
  let decodeWorker: Worker | null = null;

  return {
    actors: {
      connect: fromPromise(async ({ input }: { input: ConnectInput }) =>
        createHyphaRenderer(input.context),
      ),
      renderer: fromPromise(
        async ({ input: { context, events } }: { input: RendererInput }) => {
          const translatedEvents = events.map(([key, value]) => {
            if (key === 'cameraPose') {
              const transform = mat4.create();
              mat4.multiply(
                transform,
                context.toRendererCoordinateSystem,
                value,
              );

              const eye = vec3.create();
              mat4.getTranslation(eye, transform);

              const target = vec3.fromValues(
                transform[8],
                transform[9],
                transform[10],
              );
              vec3.subtract(target, eye, target);

              const up = vec3.fromValues(
                transform[4],
                transform[5],
                transform[6],
              );

              return ['cameraPose', { eye, up, target }];
            }

            if (key === 'image') {
              const { imageScale: multiresolution_level } =
                context.rendererProps;
              return [
                'loadImage',
                { image_path: value, multiresolution_level },
              ];
            }

            if (key === 'imageScale') {
              const { image: image_path } = context.rendererProps;
              return [
                'loadImage',
                { image_path, multiresolution_level: value },
              ];
            }

            return [key, value];
          });

          const { server } = context;
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
      imageProcessor: fromPromise(
        async ({
          input: {
            event: { image },
          },
        }) => {
          // compute toRendererCoordinateSystem
          const imageScale = image.coarsestScale;
          await image.scaleIndexToWorld(imageScale); // initializes indexToWorld matrix for getWorldBounds
          const bounds = image.getWorldBounds(imageScale);

          // match Agave by normalizing to largest dim
          const wx = bounds[1] - bounds[0];
          const wy = bounds[3] - bounds[2];
          const wz = bounds[5] - bounds[4];
          const maxDim = Math.max(wx, wy, wz);

          const scale = vec3.fromValues(maxDim, maxDim, maxDim);
          vec3.inverse(scale, scale);

          // Move to Agave origin
          const transform = mat4.fromScaling(mat4.create(), scale);
          mat4.translate(
            transform,
            transform,
            vec3.fromValues(
              -bounds[0] / maxDim,
              -bounds[2] / maxDim,
              -bounds[4] / maxDim,
            ),
          );
          return { toRendererCoordinateSystem: transform, image };
        },
      ),
    },
  };
};

export type RemoteMachineOptions = Parameters<typeof remoteMachine.provide>[0];

const createRemote = (config: RemoteMachineOptions) => {
  const remoteActor = remoteMachine.provide(config);

  return createActor(remoteActor).start();
};

export type RemoteActor = ReturnType<typeof createRemote>;

export const createRemoteViewport = (config: RemoteMachineOptions) => {
  const remote = createRemote(config);
  const viewport = remote.getSnapshot().context.viewport;

  return { remote, viewport };
};
