import { View3dActor, view3d } from '@itk-viewer/viewer/view-3d.js';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';
import { dispatchSpawn, handleLogic } from './spawn-controller.js';

type Actor = View3dActor;

@customElement('itk-view-3d')
export class ItkView3d extends LitElement {
  actor: Actor | undefined;
  scale: SelectorController<Actor, number> | undefined;
  scaleCount: SelectorController<Actor, number> | undefined;
  dispatched = false;

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

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  render() {
    if (!this.dispatched) {
      dispatchSpawn(this, 'view', view3d, (actor) => this.setActor(actor));
      this.dispatched = true;
    }

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
      <slot class="fill" @renderer=${handleLogic(this.actor)}></slot>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    .fill {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-3d': ItkView3d;
  }
}
