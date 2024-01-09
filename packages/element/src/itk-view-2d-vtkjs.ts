import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import {
  View2dVtkjsActor,
  createRenderer,
} from '@itk-viewer/vtkjs/view-2d-vtkjs.js';
import { SpawnController } from './spawn-controller.js';

@customElement('itk-view-2d-vtkjs')
export class ItkView2dVtkjs extends LitElement {
  actor: View2dVtkjsActor | undefined;
  container: HTMLElement | undefined;

  spawner = new SpawnController(
    this,
    'renderer',
    createRenderer(),
    (actor: View2dVtkjsActor) => this.setActor(actor),
  );

  getActor() {
    return this.actor;
  }

  setActor(actor: View2dVtkjsActor) {
    this.actor = actor;
    this.sendContainer();
  }

  protected sendContainer() {
    if (!this.actor) return;
    this.actor.send({ type: 'setContainer', container: this.container });
  }

  protected onContainer(container: Element | undefined) {
    if (container instanceof HTMLElement || container == undefined) {
      this.container = container;
      this.sendContainer();
    }
  }

  render() {
    return html`<div class="container" ${ref(this.onContainer)}></div>`;
  }

  static styles = css`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .container {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-vtkjs': ItkView2dVtkjs;
  }
}
