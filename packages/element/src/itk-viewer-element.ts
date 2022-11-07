import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

import { Viewer } from "itk-viewer";
import { ItkViewport } from "./itk-viewport";

@customElement("itk-viewer")
export class ItkViewer extends LitElement {
  viewer: Viewer;

  constructor() {
    super();
    this.viewer = new Viewer();
  }

  handleSlotChange(e: { target: HTMLSlotElement }) {
    const viewports = e.target.assignedElements() as ItkViewport[];
    viewports.forEach((viewport) => {
      viewport.setViewer(this.viewer);
    });
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
    "itk-viewer": ItkViewer;
  }
}
