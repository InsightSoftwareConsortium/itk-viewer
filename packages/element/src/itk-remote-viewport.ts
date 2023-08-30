/// <reference types="vite/client" />
import { PropertyValues, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';
import { ActorStatus } from 'xstate';

import {
  RemoteActor,
  createHyphaActors,
  createRemoteViewport,
} from '@itk-viewer/remote-viewport/remote-viewport.js';
import { Image } from '@itk-viewer/remote-viewport/types.js';

import { ItkViewport } from './itk-viewport.js';
import './itk-camera.js';

@customElement('itk-remote-viewport')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: Object, attribute: 'server-config' })
  serverConfig: unknown | undefined;

  @property({ type: String })
  image: string | undefined;

  @property({ type: Number })
  density = 30;

  canvas: Ref<HTMLCanvasElement> = createRef();
  canvasCtx: CanvasRenderingContext2D | null = null;

  @state()
  canvasWidth = 0;

  @state()
  canvasHeight = 0;

  remote: RemoteActor;

  remoteOnline: SelectorController<RemoteActor, boolean>;
  lastRemoteOnlineValue = false;
  renderLoopRunning = false;

  frame: SelectorController<RemoteActor, Image | undefined>;
  lastFrameValue: Image | undefined = undefined;

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(createHyphaActors());
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
    const [width, height] = size;
    this.canvasWidth = width;
    this.canvasHeight = height;
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
      <p>Image: ${this.image}</p>
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
      <itk-camera .viewport=${this.actor}>
        <canvas
          ${ref(this.canvas)}
          width=${this.canvasWidth}
          height=${this.canvasHeight}
        ></canvas>
      </itk-camera>
    `;
  }

  static styles = css`
    :host {
      margin: 0 auto;
      padding: 2rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-remote-viewport': ItkRemoteViewport;
  }
}
