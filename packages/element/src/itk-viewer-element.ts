import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { viewerMachine } from '@itk-viewer/viewer/viewer.js';
import { createActor } from 'xstate';
import { handleLogic } from './spawn-controller.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  viewer = createActor(viewerMachine).start();

  constructor() {
    super();
  }

  getActor() {
    return this.viewer;
  }

  render() {
    return html`
      <h1>Viewer</h1>
      <slot @viewport=${handleLogic(this.viewer)}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewer': ItkViewer;
  }
}
