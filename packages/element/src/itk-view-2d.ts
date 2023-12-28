import { View2dVtkjsActor } from '@itk-viewer/vtkjs/view-2d-vtkjs.js';
import { PropertyValues, LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  @property({ type: Number })
  slice = 0;

  actor: View2dVtkjsActor | undefined;

  constructor() {
    super();
  }

  handleSlotActorCreated(e: Event) {
    e.stopPropagation();
    this.actor = (e as CustomEvent).detail.actor;
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    this.slice = target.valueAsNumber;
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
    return html`
      <h1>View 2D</h1>
      <div>
        Slice: ${this.slice}
        <input
          .valueAsNumber=${this.slice}
          @change="${this.onSlice}"
          type="range"
          min="0"
          max="70.0"
          step="1.0"
        />
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
