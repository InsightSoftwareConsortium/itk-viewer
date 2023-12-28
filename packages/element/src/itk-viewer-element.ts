import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { createViewer } from '@itk-viewer/viewer/viewer.js';
import { viewerContext } from './viewer-context.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  @provide({ context: viewerContext })
  viewer = createViewer();

  constructor() {
    super();
  }

  getActor() {
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
