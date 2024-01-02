import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { LitElement, css, html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  view2d: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;

  constructor() {
    super();
  }

  handleSlotActorCreated(e: Event) {
    e.stopPropagation();
    this.view2d = (e as CustomEvent).detail.actor;
    if (!this.view2d) return;

    this.slice = new SelectorController(
      this,
      this.view2d,
      (state) => state.context.slice,
    );
    this.scale = new SelectorController(
      this,
      this.view2d,
      (state) => state.context.scale,
    );
    this.scaleCount = new SelectorController(this, this.view2d, (state) => {
      // @ts-expect-error getSnapshot not returning object with context for unknown reason
      const image = state.children.viewport?.getSnapshot()?.context.image;
      if (!image) return 1;
      return image.coarsestScale + 1;
    });
  }

  getActor() {
    return this.view2d?.getSnapshot().children.viewport;
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    this.view2d!.send({
      type: 'setSlice',
      slice: target.valueAsNumber,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.view2d!.send({ type: 'setScale', scale });
  }

  render() {
    const slice = this.slice?.value ?? 0;
    const scale = this.scale?.value ?? 0;
    const numScales = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: numScales },
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
