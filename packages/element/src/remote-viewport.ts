import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Ref, ref, createRef } from 'lit/directives/ref.js';

import { createRemoteViewport } from '@itk-viewer/remote-viewport/remote-viewport.js';

import { ItkViewport } from './itk-viewport.js';

@customElement('itk-remote-viewport')
export class RemoteViewport extends ItkViewport {
  canvas: HTMLElement;
  canvasContainer: Ref<HTMLElement> = createRef();

  constructor() {
    super();
    const { actor, element } = createRemoteViewport({
      address: 'localhost:8080',
    });
    this.actor = actor;
    this.canvas = element;
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
    canvasContainer.appendChild(this.canvas);
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
