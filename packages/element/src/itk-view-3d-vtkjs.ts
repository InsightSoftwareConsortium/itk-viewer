import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { Actor } from 'xstate';

import { view3dLogic } from '@itk-viewer/vtkjs/view-3d-vtkjs.machine.js';
import { createImplementation } from '@itk-viewer/vtkjs/view-3d-vtkjs.js';
import { SpawnController } from './spawn-controller.js';

const createLogic = () => {
  return view3dLogic.provide(createImplementation());
};

type ComponentActor = Actor<ReturnType<typeof createLogic>>;

@customElement('itk-view-3d-vtkjs')
export class ItkView3dVtkjs extends LitElement {
  actor: ComponentActor | undefined;
  container: HTMLElement | undefined;

  spawner = new SpawnController(
    this,
    'renderer',
    createLogic(),
    (actor: ComponentActor) => this.setActor(actor),
  );

  getActor() {
    return this.actor;
  }

  protected setActor(actor: ComponentActor) {
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
      min-height: 0;
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
    'itk-view-3d-vtkjs': ItkView3dVtkjs;
  }
}
