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

  cleanDimension = (v: number) => Math.max(1, Math.floor(v));

  _resizer = new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
    if (!entries.length) return;

    const { width, height } = entries[0].contentRect;
    const size = [width, height].map(this.cleanDimension) as [number, number];

    this.remote.send({
      type: 'updateRenderer',
      props: { size },
    });
  });

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(
      createHyphaMachineConfig(),
    );
    this.actor = viewport;
    this.remote = remote;
    this.remoteOnline = new SelectorController(
      this,
      this.remote,
      (state) => state?.matches('root.online') ?? false,
    );
    this.frame = new SelectorController(
      this,
      this.remote,
      (state) => state?.context.frame,
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
    this._resizer.observe(canvas);
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
