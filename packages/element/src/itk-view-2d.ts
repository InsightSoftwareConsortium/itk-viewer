import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { PropertyValues, LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  @property({ type: Number })
  slice = 0.5;

  actor: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;

  constructor() {
    super();
  }

  handleSlotActorCreated(e: Event) {
    e.stopPropagation();
    this.actor = (e as CustomEvent).detail.actor;
    if (!this.actor) return;
    this.scale = new SelectorController(
      this,
      this.actor,
      (state) => state.context.scale,
    );
    this.scaleCount = new SelectorController(this, this.actor, (state) => {
      // @ts-expect-error getSnapshot not returning object with context for unknown reason
      const image = state.children.viewport?.getSnapshot()?.context.image;
      if (!image) return 1;
      return image.coarsestScale + 1;
    });
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    this.slice = target.valueAsNumber;
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor?.send({ type: 'setScale', scale });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('slice')) {
      this.actor?.send({
        type: 'setSlice',
        slice: this.slice,
      });
    }
  }

  render() {
    const scale = this.scale?.value ?? 0;
    const numScales = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: numScales },
      (_, i) => i,
    ).reverse();

    return html`
      <h1>View 2D</h1>
      <div>
        Slice: ${this.slice}
        <input
          .valueAsNumber=${this.slice}
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
      <slot
        class="container"
        @actorCreated=${this.handleSlotActorCreated}
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
    'itk-view-2d': ItkView2d;
  }
}
