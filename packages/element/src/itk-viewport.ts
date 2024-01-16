import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { viewportMachine, ViewportActor } from '@itk-viewer/viewer/viewport.js';
import { dispatchSpawn, handleLogic } from './spawn-controller.js';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  actor: ViewportActor | undefined;
  dispatched = false;

  getActor() {
    return this.actor;
  }

  setActor(actor: ViewportActor) {
    this.actor = actor;
  }

  render() {
    if (!this.dispatched) {
      dispatchSpawn(this, 'viewport', viewportMachine, (actor) =>
        this.setActor(actor),
      );
      this.dispatched = true;
    }
    return html`
      <h1>Viewport</h1>
      <slot @view=${handleLogic(this.actor)}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewport': ItkViewport;
  }
}
