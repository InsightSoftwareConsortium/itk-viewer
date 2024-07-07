import { LitElement, html } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { View2dControls } from './view-2d-controls-controller.js';
import { ref } from 'lit/directives/ref.js';

@customElement('itk-view-2d-controls-shoelace')
export class View2dControlsShoelace extends LitElement {
  actor: View2dActor | undefined;
  private controls = new View2dControls(this);

  setActor(actor: View2dActor) {
    this.actor = actor;
    this.controls.setActor(actor);
  }

  transferFunctionContainerChanged(container: Element | undefined) {
    this.controls.setTransferFunctionContainer(container);
  }

  render() {
    const slice = this.controls.slice?.value;
    const axis = this.controls.axis?.value;
    const imageDimension = this.controls.imageDimension?.value ?? 0;
    const scale = this.controls.scale?.value;
    const scaleCount = this.controls.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    const threeD = imageDimension >= 3;
    const showScale = scaleCount >= 2;
    if (!threeD && !showScale) {
      return '';
    }
    return html`
      <sl-card>
        ${threeD
          ? html`
              <label>
                <sl-range
                  value=${Number(slice)}
                  @sl-change="${this.controls.onSlice}"
                  min="0"
                  max="1"
                  step=".01"
                  label="Slice"
                  style="min-width: 8rem;"
                ></sl-range
              ></label>
              <sl-radio-group
                label="Slice Axis"
                value=${axis}
                @sl-change="${this.controls.onAxis}"
              >
                <sl-radio-button value="I">X</sl-radio-button>
                <sl-radio-button value="J">Y</sl-radio-button>
                <sl-radio-button value="K">Z</sl-radio-button>
              </sl-select>
            `
          : ''}
        ${showScale
          ? html`
              <sl-radio-group
                label="Image Scale"
                value=${scale}
                @sl-change="${this.controls.onScale}"
              >
                ${scaleOptions.map(
                  (option) =>
                    html`<sl-radio-button value=${option}
                      >${option}</sl-radio-button
                    >`,
                )}
              </sl-radio-group>
            `
          : ''}
        <div style="padding-top: 0.4rem;">Color Range</div>
        <div
          ${ref(this.transferFunctionContainerChanged)}
          style="width: 14rem; height: 2rem;"
        ></div>
      </sl-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-controls-shoelace': View2dControlsShoelace;
  }
}
