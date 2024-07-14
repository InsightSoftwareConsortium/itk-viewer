import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ViewControls, ViewActor } from './view-controls-controller.js';
import { ref } from 'lit/directives/ref.js';

@customElement('itk-view-controls-shoelace')
export class ViewControlsShoelace extends LitElement {
  @property({ type: String })
  view: '2d' | '3d' = '2d';

  actor: ViewActor | undefined;
  private controls = new ViewControls(this);

  setActor(actor: ViewActor) {
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
    return html`
      <sl-card>
        ${threeD && this.view === '2d'
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
    'itk-view-2d-controls-shoelace': ViewControlsShoelace;
  }
}
