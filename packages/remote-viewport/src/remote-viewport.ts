import { createActor, fromPromise } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { ReadonlyMat4, mat4, vec3 } from 'gl-matrix';
import { decode, Image } from '@itk-wasm/htj2k';
import { RendererEntries, remoteMachine, Context } from './remote-machine.js';

export type { Image } from '@itk-wasm/htj2k';

// Should match constant in agave-renderer::renderer.py
const RENDERER_SERVICE_ID = 'agave-renderer';

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

  const server = await hyphaWebsocketClient.connectToServer({
    name: 'remote-renderer-client',
    server_url: serverUrl,
  });

  const pc = await hyphaWebsocketClient.getRTCService(server, serviceId);
  const renderer = await pc.getService(RENDERER_SERVICE_ID);
  await renderer.setup();

  return renderer;
};

const mat4ToLookAt = (transform: ReadonlyMat4) => {
  const eye = vec3.create();
  mat4.getTranslation(eye, transform);

  const center = vec3.fromValues(transform[8], transform[9], transform[10]);
  vec3.subtract(center, eye, center);

  const up = vec3.fromValues(transform[4], transform[5], transform[6]);

  return { eye, center, up };
};

const makeCameraPoseCommand = (
  toRendererCoordinateSystem: ReadonlyMat4,
  cameraPose: ReadonlyMat4,
) => {
  const inverted = mat4.invert(mat4.create(), cameraPose);
  const transform = mat4.multiply(
    mat4.create(),
    toRendererCoordinateSystem,
    inverted,
  );
  return ['cameraPose', mat4ToLookAt(transform)];
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
          const commands = events
            .map(([key, value]) => {
              if (key === 'cameraPose') {
                return makeCameraPoseCommand(
                  context.toRendererCoordinateSystem,
                  value,
                );
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
            })
            .flatMap((event) => {
              const [type] = event;
              if (type === 'loadImage') {
                // Resend camera pose after load image.
                // Camera is reset by Agave after load image?
                return [
                  event,
                  makeCameraPoseCommand(
                    context.toRendererCoordinateSystem,
                    context.rendererProps.cameraPose,
                  ),
                ];
              }
              return [event];
            });

          const { server } = context;
          server.updateRenderer(commands);
          const { frame: encodedImage, renderTime } = await server.render();
          const { image: frame, webWorker } = await decode(
            decodeWorker,
            encodedImage,
          );
          decodeWorker = webWorker;

          return { frame, renderTime };
        },
      ),
      // Computes world bounds and transform from VTK to Agave coordinate system
      imageProcessor: fromPromise(async ({ input: { image, imageScale } }) => {
        const bounds = await image.getWorldBounds(imageScale);

        // Remove image origin offset to world origin
        const imageOrigin = vec3.fromValues(bounds[0], bounds[2], bounds[4]);
        const transform = mat4.fromTranslation(mat4.create(), imageOrigin);

        // match Agave by normalizing to largest dim
        const wx = bounds[1] - bounds[0];
        const wy = bounds[3] - bounds[2];
        const wz = bounds[5] - bounds[4];
        const maxDim = Math.max(wx, wy, wz);
        const scale = vec3.fromValues(maxDim, maxDim, maxDim);
        mat4.scale(transform, transform, scale);

        // invert to go from VTK to Agave
        mat4.invert(transform, transform);

        return {
          toRendererCoordinateSystem: transform,
          bounds,
          image,
          imageScale,
        };
      }),
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
