import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { SelectorController } from 'xstate-lit';
import { Actor } from 'xstate';

import { createLogic } from '@itk-viewer/vtkjs/view-2d-vtkjs.js';
import { dispatchSpawn } from './spawn-controller.js';
import { Camera } from '@itk-viewer/viewer/camera.js';
import './itk-camera.js';

type ComponentActor = Actor<ReturnType<typeof createLogic>>;

@customElement('itk-view-2d-vtkjs')
export class ItkView2dVtkjs extends LitElement {
  actor: ComponentActor | undefined;
  container: HTMLElement | undefined;
  dispatched = false;

  cameraActor:
    | SelectorController<ComponentActor, Camera | undefined>
    | undefined;

  getActor() {
    return this.actor;
  }

  setActor(actor: ComponentActor) {
    this.actor = actor;
    this.sendContainer();
    this.cameraActor = new SelectorController(
      this,
      this.actor,
      (state) => state.context.camera,
    );
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
    return html`
      <itk-camera .actor=${this.cameraActor?.value} class="container">
        <div class="container" ${ref(this.onContainer)}></div>
      </itk-camera>
    `;
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
      display: flex;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-2d-vtkjs': ItkView2dVtkjs;
  }
}
