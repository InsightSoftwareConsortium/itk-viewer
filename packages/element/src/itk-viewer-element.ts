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

  handleViewportConnected(e: Event) {
    e.stopPropagation();

    const logic = (e as CustomEvent).detail.logic;
    this.viewer.send({ type: 'createViewport', logic });
    const snap = this.viewer.getSnapshot();
    const actor = snap.children[snap.context.lastId];
    (e as CustomEvent).detail.setActor(actor);
  }

  render() {
    return html`
      <h1>Viewer</h1>
      <slot @viewportConnected=${this.handleViewportConnected}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewer': ItkViewer;
  }
}
