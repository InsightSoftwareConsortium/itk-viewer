/// <reference types="vite/client" />
import { PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';
import { ActorStatus } from 'xstate';

import {
  RemoteActor,
  createHyphaMachineConfig,
  createRemoteViewport,
} from '@itk-viewer/remote-viewport/remote-viewport.js';

import type { Image } from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';
import './itk-camera.js';
import { Bounds } from '@itk-viewer/io/types.js';
import { chunk } from '@itk-viewer/io/dimensionUtils.js';

@customElement('itk-remote-viewport')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: Object, attribute: 'server-config' })
  serverConfig: unknown | undefined;

  @property({ type: Number })
  density = 30;

  canvas: Ref<HTMLCanvasElement> = createRef();
  canvasCtx: CanvasRenderingContext2D | null = null;

  camera: Ref<HTMLElement> = createRef();

  remote: RemoteActor;

  remoteOnline: SelectorController<RemoteActor, boolean>;
  lastRemoteOnlineValue = false;
  renderLoopRunning = false;

  frame: SelectorController<RemoteActor, Image | undefined>;
  lastFrameValue: Image | undefined = undefined;

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

      this.actor.send({
        type: 'setResolution',
        resolution,
      });
    },
  );

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(
      createHyphaMachineConfig(),
    );
    this.actor = viewport;
    this.remote = remote;
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

  putFrame() {
    if (!this.canvasCtx || !this.frame.value) return;

    const { size, data } = this.frame.value;
    if (!data) throw new Error('No data in frame');
    const [width, height] = size;
    if (this.canvas.value) {
      this.canvas.value.width = width;
      this.canvas.value.height = height;
    }
    const pixels = new Uint8ClampedArray(data);
    const imageData = new ImageData(pixels, width, height);
    this.canvasCtx.putImageData(imageData, 0, 0);
  }

  startRenderLoop() {
    if (this.renderLoopRunning || !this.remoteOnline.value) return;
    this.renderLoopRunning = true;

    const render = () => {
      if (!this.isConnected || this.remote.status === ActorStatus.Stopped) {
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
    const canvas = this.canvas.value;
    if (!canvas) throw new Error('canvas not found');
    this.canvasCtx = canvas.getContext('2d');
    this.resizer.observe(canvas);
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
        props: { density: this.density },
      });
    }

    if (this.frame.value && this.frame.value !== this.lastFrameValue) {
      this.lastFrameValue = this.frame.value;
      this.putFrame();
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
    const currentBounds = [
      ...this.remote.getSnapshot().context.clipBounds,
    ] as Bounds;
    currentBounds[index] = range * (normalizedBound / 100);

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

      <itk-camera ${ref(this.camera)} .viewport=${this.actor} class="camera">
        <canvas ${ref(this.canvas)} class="canvas"></canvas>
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-remote-viewport': ItkRemoteViewport;
  }
}
