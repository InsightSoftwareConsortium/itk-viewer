import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { Viewer, createViewer } from '@itk-viewer/viewer/viewer.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  viewer = createViewer();

  constructor() {
    super();
  }

  getActor(): Viewer {
    return this.viewer;
  }

  render() {
    return html`
      <h1>Viewer</h1>
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewer': ItkViewer;
  }
}
