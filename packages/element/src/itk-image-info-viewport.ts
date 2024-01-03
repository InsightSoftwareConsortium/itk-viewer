import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ViewportActor } from '@itk-viewer/viewer/viewport.js';
import { ItkViewport } from './itk-viewport.js';

@customElement('itk-image-info-viewport')
export class ImageInfoViewport extends ItkViewport {
  image:
    | SelectorController<ViewportActor, MultiscaleSpatialImage | undefined>
    | undefined;

  setActor(actor: ViewportActor) {
    super.setActor(actor);
    if (!this.actor) return;
    this.image = new SelectorController(
      this,
      this.actor,
      (state) => state.context.image,
    );
  }

  render() {
    const image = this.image?.value;
    if (!image) return html`<h1>No Image</h1>`;

    const { name, imageType, spatialDims, direction } = image;
    const imageInfo = `Image Type: ${JSON.stringify(
      imageType,
      null,
      2,
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
    'itk-image-info-viewport': ImageInfoViewport;
  }
}
