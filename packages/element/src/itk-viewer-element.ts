import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { Viewer, createViewer } from '@itk-viewer/viewer/viewer.js';
import { ItkViewport } from './itk-viewport.js';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  @property()
  imageUrl = '';

  viewer: Viewer;
  image?: MultiscaleSpatialImage;
  imageInfo = '';
  viewports: ItkViewport[] = [];

  constructor() {
    super();
    this.viewer = createViewer();
    this.createImage();
  }

  distributeImage() {
    this.viewports.forEach((viewport) => {
      if (this.image) viewport.setImage(this.image);
    });
  }

  async createImage() {
    // const storeURL = new URL(
    //   '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr',
    //   document.location.origin
    // );
    // this.image = (await ZarrMultiscaleSpatialImage.fromUrl(
    //   storeURL
    // )) as unknown as MultiscaleSpatialImage;
    this.distributeImage();
  }

  handleSlotChange(e: { target: HTMLSlotElement }) {
    this.viewports = e.target.assignedElements() as ItkViewport[];
    this.distributeImage();
  }

  render() {
    return html`
      <h1>Viewer</h1>
      <div class="viewports">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem;
    }

    .viewports {
      display: flex;
      place-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewer': ItkViewer;
  }
}
