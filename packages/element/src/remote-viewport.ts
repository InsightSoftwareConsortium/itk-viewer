import { PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Ref, ref, createRef } from 'lit/directives/ref.js';

import {
  Remote,
  createRemoteViewport,
} from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';

@customElement('itk-remote-viewport')
export class RemoteViewport extends ItkViewport {
  @property({ type: String })
  address: string | undefined;

  canvas: Ref<HTMLImageElement> = createRef();
  remote: Remote;

  constructor() {
    super();
    const { remote, viewport } = createRemoteViewport();
    this.actor = viewport;
    this.remote = remote;
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('address')) {
      this.remote.send({ type: 'setAddress', address: this.address });
    }
  }

  render() {
    return html` <h1>Remote viewport</h1>
      <img ${ref(this.canvas)}></img>`;
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
    'itk-remote-viewport': RemoteViewport;
  }
}
