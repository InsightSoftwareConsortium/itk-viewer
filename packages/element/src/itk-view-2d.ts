import { View2dActor, view2d } from '@itk-viewer/viewer/view-2d.js';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';
import { SpawnController, handleLogic } from './spawn-controller.js';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  actor: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;

  spawner = new SpawnController(this, 'view', view2d, (actor: View2dActor) =>
    this.setActor(actor),
  );

  constructor() {
    super();
  }

  setActor(actor: View2dActor) {
    this.actor = actor;

    this.slice = new SelectorController(
      this,
      this.actor,
      (state) => state.context.slice,
    );
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

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    this.actor!.send({
      type: 'setSlice',
      slice: target.valueAsNumber,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  render() {
    const slice = this.slice?.value ?? 0;
    const scale = this.scale?.value ?? 0;
    const scaleCount = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    return html`
      <h1>View 2D</h1>
      <div>
        Slice: ${slice}
        <input
          .valueAsNumber=${slice}
          @change="${this.onSlice}"
          type="range"
          min="0"
          max="1"
          step=".01"
        />
      </div>
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
      <slot class="container" @renderer=${handleLogic(this.actor)}></slot>
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
    'itk-view-2d': ItkView2d;
  }
}
