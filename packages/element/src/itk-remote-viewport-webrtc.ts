/// <reference types="vite/client" />
import { PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit';
import { ActorRefFrom } from 'xstate';

import { Bounds } from '@itk-viewer/utils/bounding-box.js';
import { chunk } from '@itk-viewer/io/dimensionUtils.js';
import { viewportMachine } from '@itk-viewer/viewer/viewport.js';
import { Camera } from '@itk-viewer/viewer/camera.js';
import {
  RemoteActor,
  createHyphaMachineConfig,
  createRemoteViewport,
  Image,
} from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';
import './itk-camera.js';

type ViewportActor = ActorRefFrom<typeof viewportMachine>;

@customElement('itk-remote-viewport-webrtc')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: Object, attribute: 'server-config' })
  serverConfig: unknown | undefined;

  @property({ type: Number })
  density = 30;

  viewport: ActorRefFrom<typeof viewportMachine>;
  remote: RemoteActor;
  cameraActor: SelectorController<ViewportActor, Camera>;

  remoteOnline: SelectorController<RemoteActor, boolean>;
  lastRemoteOnlineValue = false;
  renderLoopRunning = false;

  canvas: Ref<HTMLVideoElement> = createRef();
  frame: SelectorController<RemoteActor, Image | undefined>;
  lastFrameValue: Image | undefined = undefined;
  frameData: ImageData | undefined = undefined;

  hostCanvas = document.createElement('canvas');
  peerConnection: RTCPeerConnection | undefined = undefined;

  bounds: SelectorController<
    RemoteActor,
    {
      imageWorldBounds: Bounds;
      clipBounds: Bounds;
      clipBoundsWithNormalized: Array<readonly [number, number]>;
    }
  >;

  cleanDimension = (v: number) => Math.max(1, Math.floor(v));

  private resizer = new ResizeObserver(
    (entries: Array<ResizeObserverEntry>) => {
      if (!entries.length) return;

      const { width, height } = entries[0].contentRect;
      const resolution = [width, height].map(this.cleanDimension) as [
        number,
        number,
      ];

      this.viewport.send({
        type: 'setResolution',
        resolution,
      });
    },
  );

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(
      createHyphaMachineConfig((pc: RTCPeerConnection) =>
        this.setPeerConnection(pc),
      ),
    );
    this.viewport = viewport;
    this.remote = remote;
    this.cameraActor = new SelectorController(
      this,
      this.viewport,
      (state) => state.context.camera,
    );
    this.remoteOnline = new SelectorController(this, this.remote, (state) =>
      state.matches('root.online'),
    );
    this.frame = new SelectorController(
      this,
      this.remote,
      (state) => state.context.frame,
    );
    this.bounds = new SelectorController(
      this,
      this.remote,
      ({ context: { imageWorldBounds, clipBounds } }) => {
        // Compute normalized bounds
        const ranges = chunk(2, imageWorldBounds).map(
          ([min, max]) => max - min,
        );
        const normalizedBounds = clipBounds.map(
          (worldBound, index) =>
            (100 * worldBound) / ranges[Math.floor(index / 2)],
        );
        const clipBoundsWithNormalized = clipBounds.map(
          (bound, i) => [bound, normalizedBounds[i]] as const,
        );

        return { imageWorldBounds, clipBounds, clipBoundsWithNormalized };
      },
      (a, b) => {
        if (!a || !b) return false;
        return (
          a.imageWorldBounds === b.imageWorldBounds &&
          a.clipBounds === b.clipBounds
        );
      },
    );
  }

  protected setPeerConnection(pc: RTCPeerConnection) {
    this.peerConnection = pc;

    // connect audio / video
    this.peerConnection.addEventListener('track', (evt: RTCTrackEvent) => {
      this.canvas.value!.srcObject = evt.streams[0];
    });

    const frameRate = 10;
    // @ts-expect-error need to call getContext for Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1572422
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canvasCtx = this.hostCanvas.getContext('2d');
    const stream = this.hostCanvas.captureStream(frameRate);
    for (const track of stream.getVideoTracks()) {
      this.peerConnection.addTrack(track, stream);
    }
  }

  startRenderLoop() {
    if (this.renderLoopRunning || !this.remoteOnline.value) return;
    this.renderLoopRunning = true;

    const render = () => {
      const remoteSnap = this.remote.getSnapshot();
      if (!this.isConnected || remoteSnap.status === 'stopped') {
        this.renderLoopRunning = false;
        return;
      }

      this.remote.send({ type: 'render' });
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  connectedCallback() {
    super.connectedCallback();
    this.startRenderLoop();
  }

  firstUpdated() {
    this.resizer.observe(this.canvas.value!);
  }

  startConnection(): void {
    if (!this.serverConfig) return;

    this.remote.send({
      type: 'connect',
      config: this.serverConfig,
    });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('serverConfig')) {
      this.startConnection();
    }

    if (changedProperties.has('density')) {
      this.remote.send({
        type: 'updateRenderer',
        state: { density: this.density },
      });
    }

    if (this.remoteOnline.value !== this.lastRemoteOnlineValue) {
      this.lastRemoteOnlineValue = this.remoteOnline.value;
      if (this.remoteOnline.value) {
        this.startRenderLoop();
      }
    }
  }

  onDensity(event: Event) {
    const target = event.target as HTMLInputElement;
    this.density = target.valueAsNumber;
  }

  onBounds(event: Event, index: number) {
    const target = event.target as HTMLInputElement;
    const normalizedBound = target.valueAsNumber;
    // Find dimension range to go from normalized to world bounds
    const { imageWorldBounds } = this.remote.getSnapshot().context;
    if (!imageWorldBounds) {
      console.error('No image world bounds');
      return;
    }
    const [lowerBound, upperBound] =
      index % 2 === 0 ? [index, index + 1] : [index - 1, index];
    const range = imageWorldBounds[upperBound] - imageWorldBounds[lowerBound];
    const floor = imageWorldBounds[lowerBound];
    const currentBounds = [
      ...this.remote.getSnapshot().context.clipBounds,
    ] as Bounds;
    currentBounds[index] = range * (normalizedBound / 100) + floor;

    this.remote.send({
      type: 'setClipBounds',
      clipBounds: currentBounds,
    });
  }

  render() {
    return html`
      <h1>Remote viewport</h1>
      <p>Server Config: ${JSON.stringify(this.serverConfig)}</p>
      <div>
        Density: ${this.density}
        <input
          .valueAsNumber=${this.density}
          @change="${this.onDensity}"
          type="range"
          min="1.0"
          max="70.0"
          step="1.0"
        />
      </div>

      ${this.bounds.value.clipBoundsWithNormalized.map(
        ([world, normalized], index) => html`
          <label
            >Bound: ${world}
            <input
              .valueAsNumber=${normalized}
              @change="${(e: Event) => this.onBounds(e, index)}"
              type="range"
              min="0"
              max="100.0"
              step="1"
            />
          </label>
        `,
      )}

      <itk-camera .actor=${this.cameraActor.value} class="camera">
        <video
          ${ref(this.canvas)}
          autoplay="true"
          playsinline="true"
          class="canvas"
          muted
        ></video>
      </itk-camera>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    .camera {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .canvas {
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-remote-viewport-webrtc': ItkRemoteViewport;
  }
}
