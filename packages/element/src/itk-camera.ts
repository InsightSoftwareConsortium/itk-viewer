import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mat4 } from 'gl-matrix';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { createCamera } from '@itk-viewer/viewer/camera-machine.js';

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  viewport: Viewport | undefined;

  camera = createCamera();

  constructor() {
    super();
    this.addEventListener('mousedown', (e: MouseEvent) => {
      console.log(e.type);

      const targetCameraPose = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
      this.camera.send({
        type: 'setPose',
        pose: targetCameraPose,
      });
    });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('viewport')) {
      this.viewport?.send({ type: 'setCamera', camera: this.camera });
    }
  }

  render() {
    return html` <slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-camera': ItkCamera;
  }
}
