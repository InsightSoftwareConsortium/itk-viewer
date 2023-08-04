import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ReadonlyMat4, mat4 } from 'gl-matrix';
import createOrbitCamera from 'orbit-camera';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { Camera, createCamera } from '@itk-viewer/viewer/camera-machine.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';

type OrbitCameraController = ReturnType<typeof createOrbitCamera>;

const PAN_SPEED = 1;
const ZOOM_SPEED = 0.005;

const bindCamera = (
  camera: OrbitCameraController,
  viewport: HTMLElement,
  onUpdate: (view: ReadonlyMat4) => unknown
) => {
  let width = viewport.clientWidth;
  let height = viewport.clientHeight;

  const view = mat4.create();

  const updateView = () => {
    camera.view(view);
    mat4.invert(view, view);
    onUpdate(view);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    }
  });
  resizeObserver.observe(viewport);

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
  viewport.addEventListener('mousedown', onMouseDown);

  const onMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      rotate = false;
    } else if (e.button === 1) {
      scale = false;
    } else if (e.button === 2) {
      pan = false;
    }
  };
  window.addEventListener('mouseup', onMouseUp);

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

    updateView();
  };
  viewport.addEventListener('mousemove', onMouseMove);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    camera.zoom(e.deltaY * ZOOM_SPEED);

    updateView();
  };
  viewport.addEventListener('wheel', onWheel, { passive: false });

  const preventDefault = (e: Event) => e.preventDefault();
  viewport.addEventListener('contextmenu', preventDefault);

  const unbind = () => {
    resizeObserver.disconnect();
    viewport.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    viewport.removeEventListener('mousemove', onMouseMove);
    viewport.removeEventListener('wheel', onWheel);
    viewport.removeEventListener('contextmenu', preventDefault);
  };

  return unbind;
};

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  viewport: Viewport | undefined;

  camera: Camera;
  cameraController: OrbitCameraController;
  unbind: (() => unknown) | undefined;
  container: Ref<HTMLElement> = createRef();

  constructor() {
    super();
    this.camera = createCamera();

    this.cameraController = createOrbitCamera(
      [-0.747528, -0.570641, 0.754992],
      [0.5, 0.5, 0.5],
      [-0.505762, 0.408327, -0.759916]
    );

    const pose = this.cameraController.view();
    this.camera.send({
      type: 'setPose',
      pose,
    });
  }

  firstUpdated(): void {
    const container = this.container.value;
    if (!container) throw new Error('container not found');

    this.unbind = bindCamera(this.cameraController, container, (pose) => {
      this.camera.send({
        type: 'setPose',
        pose,
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
