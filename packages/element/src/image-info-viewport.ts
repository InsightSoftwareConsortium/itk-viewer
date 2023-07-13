import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { SelectorController } from 'xstate-lit/dist/select-controller.js';

import { ItkViewport } from './itk-viewport.js';

@customElement('image-info-viewport')
export class ImageInfoViewport extends ItkViewport {
  image = new SelectorController(
    this,
    this.actor,
    (state) => state?.context.image
  );

  render() {
    const image = this.image.value;
    if (!image) return html`<h1>No Image</h1>`;

    const { name, imageType, spatialDims, direction } = image;
    const imageInfo = `Image Type: ${JSON.stringify(
      imageType,
      null,
      2
    )}\nSpatial Dimensions: ${spatialDims}\nDirection: ${direction}`;

    return html`
      <h1>Image Information</h1>
      <pre>Name: ${name}</pre>
      <pre>${imageInfo}</pre>
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
    'image-info-viewport': ImageInfoViewport;
  }
}
