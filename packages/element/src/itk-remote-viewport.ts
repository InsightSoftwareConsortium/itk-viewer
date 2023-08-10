import { PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';

import {
  RemoteActor,
  createHyphaActors,
  createRemoteViewport,
} from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';
import './itk-camera.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';

const WIDTH = 500;
const HEIGHT = 400;

@customElement('itk-remote-viewport')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: String })
  address: string | undefined;

  @property({ type: Number })
  density = 30;

  canvas: Ref<HTMLCanvasElement> = createRef();
  canvasCtx: CanvasRenderingContext2D | null = null;

  remote: RemoteActor;
  frame: SelectorController<RemoteActor, ArrayBuffer | undefined>;
  lastFrameValue = new ArrayBuffer(0);

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport(createHyphaActors());
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

    const pixels = new Uint8ClampedArray(this.frame.value);
    const imageData = new ImageData(pixels, WIDTH, HEIGHT);
    this.canvasCtx.putImageData(imageData, 0, 0);
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
        <canvas ${ref(this.canvas)} width=${WIDTH} height=${HEIGHT}></canvas>
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
