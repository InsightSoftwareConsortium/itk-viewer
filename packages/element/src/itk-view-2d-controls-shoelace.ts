import { LitElement, html } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { View2dControls } from './view-2d-controls-controller.js';

@customElement('itk-view-2d-controls-shoelace')
export class View2dControlsShoelace extends LitElement {
  actor: View2dActor | undefined;
  private controls = new View2dControls(this);

  setActor(actor: View2dActor) {
    this.actor = actor;
    this.controls.setActor(actor);
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
    const slice = this.controls.slice?.value;
    const scale = this.controls.scale?.value;
    const scaleCount = this.controls.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    return html`
      <sl-card>
        <sl-range
          .value=${Number(slice)}
          @sl-change="${this.controls.onSlice}"
          min="0"
          max="1"
          step=".01"
          label="Slice"
        ></sl-range>
        <sl-select
          label="Image Scale"
          value=${scale}
          @sl-change="${this.controls.onScale}"
        >
          ${scaleOptions.map(
            (option) =>
              html`<sl-option value=${option}> ${option} </sl-option>`,
          )}
        </sl-select>
      </sl-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-controls-shoelace': View2dControlsShoelace;
  }
}
