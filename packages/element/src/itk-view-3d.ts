import { View3dActor, view3d } from '@itk-viewer/viewer/view-3d.js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { SelectorController } from 'xstate-lit';
import { dispatchSpawn, handleLogic } from './spawn-controller.js';
import { Camera } from '@itk-viewer/viewer/camera.js';
import './itk-view-3d-vtkjs.js';
import './itk-camera.js';

type Actor = View3dActor;
type Renderer = 'vtkjs' | 'slot';

@customElement('itk-view-3d')
export class ItkView3d extends LitElement {
  @property({ type: String })
  renderer: Renderer = 'slot';

  actor: Actor | undefined;
  scale: SelectorController<Actor, number> | undefined;
  scaleCount: SelectorController<Actor, number> | undefined;
  cameraActor: SelectorController<Actor, Camera | undefined> | undefined;
  dispatched = false;

  setActor(actor: Actor) {
    this.actor = actor;

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
    this.cameraActor = new SelectorController(
      this,
      this.actor,
      (state) => state.context.camera,
    );
  }

  getActor() {
    return this.actor;
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  getRenderer() {
    if (this.renderer === 'vtkjs') {
      return html`<itk-view-3d-vtkjs></itk-view-3d-vtkjs>`;
    } else if (this.renderer === 'slot') {
      return html`<slot></slot>`;
    }
    const _exhaustiveCheck: never = this.renderer;
    throw new Error(`Invalid renderer ${_exhaustiveCheck}`);
  }

  render() {
    if (!this.dispatched) {
      dispatchSpawn(this, 'view', view3d, (actor) => this.setActor(actor));
      this.dispatched = true;
    }

    return html`
      <itk-camera
        class="fill"
        .actor=${this.cameraActor?.value}
        @renderer=${handleLogic(this.actor)}
      >
        ${this.getRenderer()}
      </itk-camera>
    `;
  }

  static styles = css`
    .fill {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-view-3d': ItkView3d;
  }
}
