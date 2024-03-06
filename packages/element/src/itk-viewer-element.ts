import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import { viewerMachine } from '@itk-viewer/viewer/viewer.js';
import { createActor } from 'xstate';
import { handleLogic } from './spawn-controller.js';

@customElement('itk-viewer')
export class ItkViewer extends LitElement {
  actor = createActor(viewerMachine).start();

  getActor() {
    return this.actor;
  }

  render() {
    return html`<slot @viewport=${handleLogic(this.actor)}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewer': ItkViewer;
  }
}
