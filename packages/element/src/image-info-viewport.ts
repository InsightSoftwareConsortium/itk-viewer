import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ItkViewport } from './itk-viewport.js';

@customElement('image-info-viewport')
export class ImageInfoViewport extends ItkViewport {
  image?: MultiscaleSpatialImage;
  @property()
  imageInfo = '';
  @property()
  imageName = '';

  constructor() {
    super();
  }

  setImage(image: MultiscaleSpatialImage) {
    this.image = image;
    this.imageName = this.image.name;
    console.log(this.image);
    const { imageType, spatialDims, direction } = this.image;
    this.imageInfo = `Image Type: ${JSON.stringify(
      imageType,
      null,
      2
    )}\nSpatial Dimensions: ${spatialDims}\nDirection: ${direction}`;
  }

  render() {
    return html`
      <h1>${this.imageName} Information</h1>
      <pre>${this.imageInfo}</pre>
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
    'image-info-viewport': ItkViewport;
  }
}
