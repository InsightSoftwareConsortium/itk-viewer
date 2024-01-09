import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { viewportMachine, ViewportActor } from '@itk-viewer/viewer/viewport.js';
import { SpawnController, handleLogic } from './spawn-controller.js';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  actor: ViewportActor | undefined;

  spawner = new SpawnController(
    this,
    'viewport',
    viewportMachine,
    (actor) => (this.actor = actor),
  );

  constructor() {
    super();
  }

  getActor() {
    return this.actor;
  }

  setActor(actor: ViewportActor) {
    this.actor = actor;
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  render() {
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
