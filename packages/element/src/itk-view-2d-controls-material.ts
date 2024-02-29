import { LitElement, css, html, nothing } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';

@customElement('itk-view-2d-controls-material')
export class View2dControlsMaterial extends LitElement {
  actor: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;

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
    this.requestUpdate(); // trigger render with selected state
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    const slice = Number(target.value);
    this.actor!.send({
      type: 'setSlice',
      slice,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  render() {
    const slice = this.slice?.value;
    const scale = this.scale?.value;
    const scaleCount = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    return html`
      <div class="card">
        <label>
          Slice
          <md-slider
            .value=${slice}
            @change="${this.onSlice}"
            min="0"
            max="1"
            step=".01"
            labeled
            label="Slice"
          ></md-slider>
        </label>
        <md-outlined-select
          @change="${this.onScale}"
          label="Image Scale"
          style="display: block;"
        >
          ${scaleOptions.map(
            (option) =>
              html`<md-select-option
                value=${option}
                selected=${option === scale ? 'selected' : nothing}
              >
                ${option}
              </md-select-option>`,
          )}
        </md-outlined-select>
      </div>
    `;
  }

  static styles = css`
    .card {
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 0.5rem;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-controls-material': View2dControlsMaterial;
  }
}
