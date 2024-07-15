import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import './itk-viewer-element.js';
import { ItkViewer } from './itk-viewer-element.js';
import './itk-viewport.js';
import { ItkView3d } from './itk-view-3d.js';
import './itk-view-3d.js';
import './itk-view-3d-vtkjs.js';
import { ViewControlsShoelace } from './itk-view-controls-shoelace.js';
import './itk-view-controls-shoelace.js';

@customElement('itk-viewer-3d')
export class ItkViewer3d extends LitElement {
  viewer: Ref<ItkViewer> = createRef();
  view: Ref<ItkView3d> = createRef();
  controls: Ref<ViewControlsShoelace> = createRef();

  getActor() {
    return this.viewer.value?.getActor();
  }

  render() {
    return html`
      <itk-viewer class="fill" ${ref(this.viewer)}>
        <itk-viewport class="fill">
          <div style="position: relative" class="fill">
            <div style="position: absolute; top: 0.25rem; left: 0.25rem">
              <itk-view-controls-shoelace
                view="3d"
                ${ref(this.controls)}
              ></itk-view-controls-shoelace>
            </div>
            <itk-view-3d ${ref(this.view)} class="fill">
              <itk-view-3d-vtkjs></itk-view-3d-vtkjs>
            </itk-view-3d>
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
      width: 100%;
      height: 100%;
      display: flex;
    }

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
    'itk-viewer-3d': ItkViewer3d;
  }
}
