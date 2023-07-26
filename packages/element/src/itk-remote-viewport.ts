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

@customElement('itk-remote-viewport')
export class ItkRemoteViewport extends ItkViewport {
  @property({ type: String })
  address: string | undefined;

  @property({ type: Number })
  density = 30;

  remote: RemoteActor;
  frame: SelectorController<RemoteActor, string | undefined>;
  lastFrameValue = '';
  imageSrc = '';

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
      this.imageSrc = 'data:image/png;base64,' + this.frame.value;
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
      <itk-camera .viewport=${this.actor}>
        <img src=${this.imageSrc}></img>
      </itk-camera>
      <div>
        Density: ${this.density}
        <input .valueAsNumber=${this.density} 
        @change="${this.onDensity}" 
        type="range" min="1.0" max="70.0" step="1.0" 
        />
      </div>
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
