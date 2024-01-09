import { View3dActor, view3d } from '@itk-viewer/viewer/view-3d.js';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';

type Actor = View3dActor;

@customElement('itk-view-3d')
export class ItkView3d extends LitElement {
  actor: Actor | undefined;
  scale: SelectorController<Actor, number> | undefined;
  scaleCount: SelectorController<Actor, number> | undefined;

  constructor() {
    super();
  }

  protected dispatchLogic() {
    const event = new CustomEvent('viewConnected', {
      bubbles: true,
      composed: true,
      detail: {
        logic: view3d,
        setActor: (actor: View3dActor) => this.setActor(actor),
      },
    });

    this.dispatchEvent(event);
  }

  setActor(actor: Actor) {
    this.actor = actor;

    this.scale = new SelectorController(
      this,
      this.actor,
      (state) => state.context.scale,
    );
    this.scaleCount = new SelectorController(this, this.actor, (state) => {
      const image = state.context.image;
      if (!image) return 1;
      return image.coarsestScale + 1;
    });
  }

  getActor() {
    return this.actor;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.dispatchLogic();
  }

  handleRendererConnected(e: Event) {
    e.stopPropagation();
    if (!this.actor)
      throw new Error('Child renderer connected but no actor available');

    const logic = (e as CustomEvent).detail.logic;
    this.actor.send({ type: 'createRenderer', logic });
    const snap = this.actor.getSnapshot();
    const actor = snap.children[snap.context.lastId];
    (e as CustomEvent).detail.setActor(actor);
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  render() {
    const scale = this.scale?.value ?? 0;
    const scaleCount = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    return html`
      <h1>View 3D</h1>
      <div>
        <label for="scale-select">Scale</label>
        <select value=${scale} @change="${this.onScale}" type="choice">
          ${scaleOptions.map(
            (option) =>
              html`<option selected=${option === scale || nothing}>
                ${option}
              </option>`,
          )}
        </select>
      </div>
      <slot
        class="container"
        @rendererConnected=${this.handleRendererConnected}
      ></slot>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    .container {
      flex: 1;
      min-height: 0;
      display: flex;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-3d': ItkView3d;
  }
}
