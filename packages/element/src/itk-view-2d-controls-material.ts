import { LitElement, css, html, nothing } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { ViewControls } from './view-controls-controller.js';
import '@material/web/slider/slider.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

@customElement('itk-view-2d-controls-material')
export class View2dControlsMaterial extends LitElement {
  actor: View2dActor | undefined;
  private controls = new ViewControls(this);

  setActor(actor: View2dActor) {
    this.actor = actor;
    this.controls.setActor(actor);
  }

  render() {
    const slice = this.controls.slice?.value;
    const imageDimension = this.controls.imageDimension?.value ?? 0;
    const scale = this.controls.scale?.value;
    const scaleCount = this.controls.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    const showSliceSlider = imageDimension >= 3;
    const showScale = scaleCount >= 2;
    if (!showSliceSlider && !showScale) {
      return '';
    }

    return html`
      <div class="card">
        ${showSliceSlider
          ? html`<label>
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
            </label>`
          : ''}
        ${showScale
          ? html` <md-outlined-select
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
            </md-outlined-select>`
          : ''}
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
