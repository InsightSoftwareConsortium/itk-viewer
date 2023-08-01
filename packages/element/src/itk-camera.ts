import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ReadonlyMat4, mat4 } from 'gl-matrix';
import createOrbitCamera from 'orbit-camera';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { createCamera } from '@itk-viewer/viewer/camera-machine.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';

type OrbitCameraController = ReturnType<typeof createOrbitCamera>;

const PAN_SPEED = 1;

const bindCamera = (
  camera: OrbitCameraController,
  element: HTMLElement,
  onUpdate: (view: ReadonlyMat4) => unknown
) => {
  let width = element.clientWidth;
  let height = element.clientHeight;

  const view = mat4.create();

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    }
  });
  resizeObserver.observe(element);

  let rotate = false;
  let pan = false;
  let scale = false;

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      rotate = true;
    } else if (e.button === 1) {
      scale = true;
    } else if (e.button === 2) {
      pan = true;
    }
  };
  element.addEventListener('mousedown', onMouseDown);

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      rotate = false;
    } else if (e.button === 1) {
      scale = false;
    } else if (e.button === 2) {
      pan = false;
    }
  };
  element.addEventListener('mouseup', onMouseUp);

  let prevMouseX = 0;
  let prevMouseY = 0;

  const onMouseMove = (e: MouseEvent) => {
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    if (rotate) {
      camera.rotate(
        [mouseX / width - 0.5, mouseY / height - 0.5],
        [prevMouseX / width - 0.5, prevMouseY / height - 0.5]
      );
    }

    if (pan) {
      camera.pan([
        (PAN_SPEED * (mouseX - prevMouseX)) / width,
        (PAN_SPEED * (mouseY - prevMouseY)) / height,
      ]);
    }

    if (scale) {
      const d = mouseY - prevMouseY;
      if (d) camera.distance *= Math.exp(d / height);
    }

    prevMouseX = mouseX;
    prevMouseY = mouseY;

    if (!rotate && !pan && !scale) return;
    camera.view(view);
    onUpdate(view);
  };
  element.addEventListener('mousemove', onMouseMove);

  const unbind = () => {
    resizeObserver.disconnect();
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('mouseup', onMouseUp);
  };

  return unbind;
};

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  viewport: Viewport | undefined;

  camera = createCamera();
  unbind: (() => unknown) | undefined;
  container: Ref<HTMLElement> = createRef();

  firstUpdated(): void {
    const cameraController = createOrbitCamera(
      [-0.747528, -0.570641, 0.754992],
      [0.5, 0.5, 0.5],
      [-0.505762, 0.408327, -0.759916]
    );

    const container = this.container.value;
    if (!container) throw new Error('container not found');

    this.unbind = bindCamera(cameraController, container, (view) => {
      this.camera.send({
        type: 'setPose',
        pose: view,
      });
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unbind?.();
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('viewport')) {
      this.viewport?.send({ type: 'setCamera', camera: this.camera });
    }
  }

  render() {
    return html`
      <div class="container" ${ref(this.container)}>
        <slot></slot>
      </div>
    `;
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
