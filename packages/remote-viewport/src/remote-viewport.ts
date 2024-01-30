import { createActor, fromPromise } from 'xstate';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { ReadonlyMat4, mat4, vec3 } from 'gl-matrix';
import { decode, Image } from '@itk-wasm/htj2k';
export type { Image } from '@itk-wasm/htj2k';
import { Bounds } from '@itk-viewer/utils/bounding-box.js';
import { XYZ } from '@itk-viewer/io/dimensionUtils.js';
import {
  MultiscaleSpatialImage,
  worldBoundsToIndexBounds,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { transformBounds } from '@itk-viewer/io/transformBounds.js';
import { RendererEntries, remoteMachine, Context } from './remote-machine.js';

// Should match constant in agave-renderer::renderer.py
const RENDERER_SERVICE_ID = 'agave-renderer';

type RenderedFrame = {
  frame: Image;
  renderTime: number;
};

type Renderer = {
  updateRenderer: (events: unknown) => unknown;
  render: () => Promise<{ frame: Uint8Array; renderTime: number }>;
  getRenderTime: () => Promise<{ renderTime: number }>;
};

type MachineContext = Omit<Context, 'server'> & { server: Renderer };

type RendererInput = {
  context: MachineContext;
  commands: RendererEntries;
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

type PeerConnectionInitCallback = ((pc: RTCPeerConnection) => void) | undefined;

const createHyphaRenderer = async (
  context: Context,
  onPeerConnctionInit: PeerConnectionInitCallback,
) => {
  const { serverUrl, serviceId } = context.serverConfig as HyphaServiceConfig;
  if (!serverUrl) {
    throw new Error('No server url provided');
  }

  const server = await hyphaWebsocketClient.connectToServer({
    name: 'remote-renderer-client',
    server_url: serverUrl,
  });

  const pc = await hyphaWebsocketClient.getRTCService(server, serviceId, {
    on_init: onPeerConnctionInit,
  });

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

type Command = [string, unknown];

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
  return ['cameraPose', mat4ToLookAt(transform)] as Command;
};

const makeLoadImageCommand = ([type, payload]: Command, context: Context) => {
  const { imageIndexClipBounds } = context;
  if (!imageIndexClipBounds) throw new Error('No image index clip bounds');
  const image_path = type === 'image' ? payload : context.rendererState.image;
  const multiresolution_level =
    type === 'imageScale' ? payload : context.rendererState.imageScale;
  const channelRange = imageIndexClipBounds.get('c') ?? [0, 0];
  const cDelta = channelRange[1] - channelRange[0];
  const channels = Array.from(
    { length: cDelta + 1 }, // +1 for inclusive
    (_, i) => i + channelRange[0],
  );
  const region = XYZ.flatMap((dim) => imageIndexClipBounds.get(dim));
  return [
    'loadImage',
    {
      image_path,
      multiresolution_level,
      channels,
      region,
    },
  ] as Command;
};

export const createHyphaMachineConfig = (
  peerConnectionInitCallback: PeerConnectionInitCallback = undefined,
) => {
  let decodeWorker: Worker | null = null;

  return {
    actors: {
      connect: fromPromise(async ({ input }: { input: ConnectInput }) =>
        createHyphaRenderer(input.context, peerConnectionInitCallback),
      ),
      commandSender: fromPromise(
        async ({ input: { context, commands } }: { input: RendererInput }) => {
          const { commands: translatedCommands } = commands
            .map(([key, value]) => {
              if (key === 'cameraPose') {
                return makeCameraPoseCommand(
                  context.toRendererCoordinateSystem,
                  value,
                );
              }
              if (key === 'image' || key === 'imageScale') {
                return makeLoadImageCommand([key, value], context);
              }
              return [key, value];
            })
            .flatMap((command) => {
              const [type] = command;
              if (type === 'loadImage') {
                // Resend camera pose after load image.
                // Camera is reset by Agave after load image?
                return [
                  command as Command,
                  makeCameraPoseCommand(
                    context.toRendererCoordinateSystem,
                    context.rendererState.cameraPose,
                  ),
                ];
              }
              return [command as Command];
            })
            .reduceRight(
              // filter duplicate commands
              ({ commands, seenCommands }, command) => {
                const [type] = command;
                if (seenCommands.has(type)) {
                  return { commands, seenCommands };
                }
                seenCommands.add(type);
                return { commands: [command, ...commands], seenCommands };
              },
              {
                commands: [] as Array<Command>,
                seenCommands: new Set<string>(),
              },
            );

          context.server.updateRenderer(translatedCommands);
        },
      ),
      renderer: fromPromise<unknown, { context: MachineContext }>(
        async ({
          input: {
            context: { server },
          },
        }) => {
          if (peerConnectionInitCallback) {
            const { renderTime } = await server.getRenderTime();
            return { renderTime };
          }
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
      imageProcessor: fromPromise<
        unknown,
        {
          image: MultiscaleSpatialImage;
          imageScale: number;
          clipBounds: Bounds;
        }
      >(async ({ input: { image, imageScale, clipBounds } }) => {
        const indexToWorld = await image.scaleIndexToWorld(imageScale);
        const imageWorldToIndex = mat4.invert(mat4.create(), indexToWorld);

        const fullIndexBounds = image.getIndexBounds(imageScale);
        const byDim = worldBoundsToIndexBounds({
          bounds: clipBounds,
          fullIndexBounds,
          worldToIndex: imageWorldToIndex,
        });

        // loaded image world bounds
        const bounds = transformBounds(
          indexToWorld,
          XYZ.flatMap((dim) => byDim.get(dim)) as Bounds,
        );

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

        const fullWorldBounds = await image.getWorldBounds(imageScale);
        return {
          toRendererCoordinateSystem: transform,
          bounds: fullWorldBounds,
          image,
          imageScale,
          imageWorldToIndex,
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
