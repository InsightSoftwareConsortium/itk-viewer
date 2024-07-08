import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { ItkViewer } from './itk-viewer-element.js';
import './itk-viewport.js';
import './itk-view-3d.js';
import './itk-view-3d-vtkjs.js';

@customElement('itk-viewer-3d')
export class ItkViewer3d extends LitElement {
  viewer: Ref<ItkViewer> = createRef();

  getActor() {
    return this.viewer.value?.getActor();
  }

  render() {
    return html`
      <itk-viewer class="fill" ${ref(this.viewer)}>
        <itk-viewport class="fill">
          <itk-view-3d class="fill">
            <itk-view-3d-vtkjs></itk-view-3d-vtkjs>
          </itk-view-3d>
        </itk-viewport>
      </itk-viewer>
    `;
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
