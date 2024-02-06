import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { Actor } from 'xstate';

import { createLogic } from '@itk-viewer/vtkjs/view-3d-vtkjs.js';
import { dispatchSpawn } from './spawn-controller.js';

type ComponentActor = Actor<ReturnType<typeof createLogic>>;

@customElement('itk-view-3d-vtkjs')
export class ItkView3dVtkjs extends LitElement {
  actor: ComponentActor | undefined;
  container: HTMLElement | undefined;
  dispatched = false;

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
    if (!this.dispatched) {
      dispatchSpawn(this, 'renderer', createLogic(), (actor) =>
        this.setActor(actor),
      );
      this.dispatched = true;
    }

    return html` <div class="container" ${ref(this.onContainer)}></div> `;
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
      display: flex;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-3d-vtkjs': ItkView3dVtkjs;
  }
}
