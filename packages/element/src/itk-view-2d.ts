import { View2dActor, view2d } from '@itk-viewer/viewer/view-2d.js';
import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { dispatchSpawn, handleLogic } from './spawn-controller.js';

@customElement('itk-view-2d')
export class ItkView2d extends LitElement {
  actor: View2dActor | undefined;
  dispatched = false;

  setActor(actor: View2dActor) {
    this.actor = actor;
  }

  getActor() {
    return this.actor;
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    this.actor!.send({
      type: 'setSlice',
      slice: target.valueAsNumber,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  render() {
    if (!this.dispatched) {
      dispatchSpawn(this, 'view', view2d, (actor) => this.setActor(actor));
      this.dispatched = true;
    }

    return html`
      <slot class="container" @renderer=${handleLogic(this.actor)}></slot>
    `;
  }

  static styles = css`
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
