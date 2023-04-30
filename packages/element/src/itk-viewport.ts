import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { Viewer, Viewport } from '@itk-viewer/viewer';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  viewer?: Viewer;

  constructor() {
    super();
  }

  setViewer(viewer: Viewer) {
    this.viewer = viewer;
    this.viewer.addViewport(new Viewport());
  }

  render() {
    return html` <h1>Viewport</h1> `;
  }

  static styles = css`
    :host {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewport': ItkViewport;
  }
}
