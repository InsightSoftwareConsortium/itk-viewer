import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mat4 } from 'gl-matrix';
import createOrbitCamera from 'orbit-camera';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { createCamera } from '@itk-viewer/viewer/camera-machine.js';

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  viewport: Viewport | undefined;

  camera = createCamera();

  constructor() {
    super();
    const view = mat4.create();
    const cameraController = createOrbitCamera(
      [0, 0, 1],
      [0.5, 0.5, 0.5],
      [0, 1, 0]
    );

    const prevMouse = [0, 0];

    const shell = { width: 500, height: 400 };

    this.addEventListener('mousemove', (e: MouseEvent) => {
      const [mouseX, mouseY] = [e.clientX, e.clientY];
      const [prevMouseX, prevMouseY] = prevMouse;

      cameraController.rotate(
        [mouseX / shell.width - 0.5, mouseY / shell.height - 0.5],
        [prevMouseX / shell.width - 0.5, prevMouseY / shell.height - 0.5]
      );

      cameraController.view(view);
      this.camera.send({
        type: 'setPose',
        pose: view,
      });
    });
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('viewport')) {
      this.viewport?.send({ type: 'setCamera', camera: this.camera });
    }
  }

  render() {
    return html`<div class="container"><slot></slot></div>`;
  }

  static styles = css`
    .container {
      min-width: 500px;
      min-height: 400px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-camera': ItkCamera;
  }
}
