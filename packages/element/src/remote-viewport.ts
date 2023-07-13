import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Ref, ref, createRef } from 'lit/directives/ref.js';

import { createViewport } from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';

@customElement('remote-viewport')
export class RemoteViewport extends ItkViewport {
  remoteCanvas: HTMLElement;
  canvasContainer: Ref<HTMLElement> = createRef();

  constructor() {
    super();
    const { actor, element } = createViewport({ address: 'localhost:8080' });
    this.actor = actor;
    this.remoteCanvas = element;
  }

  render() {
    return html` <h1>Remote viewport</h1>
      <div ${ref(this.canvasContainer)}></div>`;
  }

  firstUpdated() {
    const canvasContainer = this.canvasContainer.value;
    if (!canvasContainer) {
      throw new Error('canvasContainer is undefined');
    }
    canvasContainer.appendChild(this.remoteCanvas);
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
    'remote-viewport': RemoteViewport;
  }
}
