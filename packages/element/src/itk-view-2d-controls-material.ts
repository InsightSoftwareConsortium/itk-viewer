import { LitElement, css, html, nothing } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { View2dControls } from './view-2d-controls-controller.js';

@customElement('itk-view-2d-controls-material')
export class View2dControlsMaterial extends LitElement {
  actor: View2dActor | undefined;
  private controls = new View2dControls(this);

  setActor(actor: View2dActor) {
    this.actor = actor;
    this.controls.setActor(actor);
  }

  render() {
    const slice = this.controls.slice?.value;
    const scale = this.controls.scale?.value;
    const scaleCount = this.controls.scaleCount?.value ?? 1;
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
            @change="${this.controls.onSlice}"
            min="0"
            max="1"
            step=".01"
            labeled
            label="Slice"
          ></md-slider>
        </label>
        <md-outlined-select
          @change="${this.controls.onScale}"
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
