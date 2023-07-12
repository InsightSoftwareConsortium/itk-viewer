import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { Viewer, createViewer } from '@itk-viewer/viewer/viewer.js';
import { ItkViewport } from './itk-viewport.js';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  viewer: Viewer;
  image?: MultiscaleSpatialImage;
  viewports: ItkViewport[] = [];

  constructor() {
    super();
    this.viewer = createViewer();
  }

  distributeImage() {
    this.viewports.forEach((viewport) => {
      if (this.image) viewport.setImage(this.image);
    });
  }

  addImage(image: MultiscaleSpatialImage) {
    this.image = image;
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
