import { viewportMachine } from '@itk-viewer/viewer/viewport-machine.js';
import { createViewport } from '@itk-viewer/viewer/viewport.js';
import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ActorRefFrom } from 'xstate';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  actor: ActorRefFrom<typeof viewportMachine> = createViewport();

  constructor() {
    super();
  }

  getActor() {
    return this.actor;
  }

  render() {
    return html`<h1>Viewport</h1>`;
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
    'itk-viewport': ItkViewport;
  }
}
