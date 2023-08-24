/// <reference types="vite/client" />
import { PropertyValues, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';

import {
  RemoteActor,
  createHyphaActors,
  createRemoteViewport,
} from '@itk-viewer/remote-viewport/remote-viewport.js';
import { Image } from '@itk-viewer/remote-viewport/types.js';

import { ItkViewport } from './itk-viewport.js';
import './itk-camera.js';

const SERVICE_ID = import.meta.env.VITE_HYPHA_RENDER_SERVICE_ID;

const makeMultiscaleImage = (image: string) => {
  if (image.endsWith('.tif')) {
    return {
      scaleCount: 1,
      scale: 0,
    };
  }
  return {
    scaleCount: 8,
    scale: 7,
  };
};

@customElement('itk-remote-viewport')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: String })
  address: string | undefined;

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
  frame: SelectorController<RemoteActor, Image | undefined>;
  lastFrameValue: Image | undefined = undefined;

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(
      createHyphaActors(SERVICE_ID)
    );
    this.actor = viewport;
    this.remote = remote;
    this.frame = new SelectorController(
      this,
      this.remote,
      (state) => state?.context.frame
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

  connectedCallback() {
    super.connectedCallback();

    const render = () => {
      if (!this.isConnected) return;

      this.remote.send({ type: 'render' });
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  firstUpdated(): void {
    const canvas = this.canvas.value;
    if (!canvas) throw new Error('canvas not found');
    this.canvasCtx = canvas.getContext('2d');
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('address')) {
      this.remote.send({ type: 'setAddress', address: this.address });
    }
    if (changedProperties.has('image')) {
      if (this.image) {
        const multiscaleImage = makeMultiscaleImage(this.image);
        this.remote.send({
          type: 'setMultiscaleImage',
          image: multiscaleImage,
        });

        this.remote.send({
          type: 'updateRenderer',
          props: { image: this.image },
        });
      }
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
  }

  onDensity(event: Event) {
    const target = event.target as HTMLInputElement;
    this.density = target.valueAsNumber;
  }

  render() {
    return html`
      <h1>Remote viewport</h1>
      <p>Address: ${this.address}</p>
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
