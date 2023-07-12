import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  image?: MultiscaleSpatialImage;

  constructor() {
    super();
  }

  setImage(image: MultiscaleSpatialImage) {
    this.image = image;
  }

  render() {
    return html`<h1>Viewport</h1>`;
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
