import { LitElement, html } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { customElement } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';

@customElement('view-2d-controls')
export class View2dControls extends LitElement {
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
    this.requestUpdate(); // needed to trigger render with selected state
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
    const slice = this.slice?.value ?? 0;
    const scale = this.scale?.value ?? 0;
    const scaleCount = this.scaleCount?.value ?? 1;
    const scaleOptions = Array.from(
      { length: scaleCount },
      (_, i) => i,
    ).reverse();

    return html`
      <sl-card class="card-basic">
        <sl-range
          .value=${Number(slice)}
          @sl-change="${this.onSlice}"
          min="0"
          max="1"
          step=".01"
          label="Slice"
        ></sl-range>
        <sl-select
          label="Image Scale"
          value=${scale}
          @sl-change="${this.onScale}"
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
    'view-2d-controls': View2dControls;
  }
}
