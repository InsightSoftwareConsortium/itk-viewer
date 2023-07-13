import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { Viewer, createViewer } from '@itk-viewer/viewer/viewer.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  viewer = createViewer();

  constructor() {
    super();
  }

  getActor(): Viewer {
    return this.viewer;
  }

  render() {
    return html`
      <h1>Viewer</h1>
      <div class="viewports">
        <slot></slot>
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
