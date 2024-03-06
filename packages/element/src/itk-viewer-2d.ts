import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import './itk-viewer-element.js';
import { ItkViewer } from './itk-viewer-element.js';
import './itk-viewport.js';
import './itk-view-2d.js';
import { ItkView2d } from './itk-view-2d.js';
import './itk-view-2d-vtkjs.js';
import { View2dControlsShoelace } from './itk-view-2d-controls-shoelace.js';
import './itk-view-2d-controls-shoelace.js';
import { View2dControlsMaterial } from './itk-view-2d-controls-material.js';
// import './itk-view-2d-controls-material.js';

@customElement('itk-viewer-2d')
export class ItkViewer2d extends LitElement {
  viewer: Ref<ItkViewer> = createRef();
  view: Ref<ItkView2d> = createRef();
  controls: Ref<View2dControlsMaterial | View2dControlsShoelace> = createRef();

  getActor() {
    return this.viewer.value?.getActor();
  }

  render() {
    return html`
      <itk-viewer class="fill" ${ref(this.viewer)}>
        <itk-viewport class="fill">
          <div style="position: relative" class="fill">
            <div style="position: absolute; top: 0.25rem; left: 0.25rem">
              <itk-view-2d-controls-shoelace
                ${ref(this.controls)}
              ></itk-view-2d-controls-shoelace>
              <!-- <itk-view-2d-controls-material
                id="view-controls"
              ></itk-view-2d-controls-material> -->
            </div>
            <itk-view-2d ${ref(this.view)} class="fill">
              <itk-view-2d-vtkjs></itk-view-2d-vtkjs>
            </itk-view-2d>
          </div>
        </itk-viewport>
      </itk-viewer>
    `;
  }

  protected async firstUpdated() {
    await this.updateComplete; // Wait for view to render
    const viewActor = this.view.value!.getActor()!;
    const controls = this.controls.value!;
    controls.setActor(viewActor);
  }

  static styles = css`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .fill {
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
    'itk-viewer-2d': ItkViewer2d;
  }
}
