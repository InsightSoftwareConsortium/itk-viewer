import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  viewportMachine,
  ViewportActor,
} from '@itk-viewer/viewer/viewport-machine.js';

@customElement('itk-viewport')
export class ItkViewport extends LitElement {
  actor: ViewportActor | undefined;

  constructor() {
    super();
  }

  protected dispatchLogic() {
    const event = new CustomEvent('viewportConnected', {
      bubbles: true,
      composed: true,
      detail: {
        logic: viewportMachine,
        setActor: (actor: ViewportActor) => this.setActor(actor),
      },
    });

    this.dispatchEvent(event);
  }

  setActor(actor: ViewportActor) {
    this.actor = actor;
  }

  getActor() {
    return this.actor;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.dispatchLogic();
  }

  handleViewConnected(e: Event) {
    if (!this.actor) return;
    e.stopPropagation();

    const logic = (e as CustomEvent).detail.logic;
    this.actor.send({ type: 'createView', logic });
    const snap = this.actor.getSnapshot();
    const actor = snap.children[snap.context.lastId];
    (e as CustomEvent).detail.setActor(actor);
  }

  render() {
    return html`
      <h1>Viewport</h1>
      <slot @viewConnected=${this.handleViewConnected}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-viewport': ItkViewport;
  }
}
