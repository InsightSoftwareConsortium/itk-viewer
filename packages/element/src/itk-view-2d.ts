import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { createView2d } from '@itk-viewer/vtkjs/view-2d.js';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  actor = createView2d();

  constructor() {
    super();
  }

  getActor() {
    return this.actor;
  }

  render() {
    return html`<h1>View 2D</h1>`;
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
    'itk-view-2d': ItkView2d;
  }
}
