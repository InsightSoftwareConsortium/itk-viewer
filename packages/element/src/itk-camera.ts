import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ReadonlyMat4, mat4 } from 'gl-matrix';
import createOrbitCamera from 'orbit-camera';
import type { OrbitCamera } from 'orbit-camera';

import { Viewport } from '@itk-viewer/viewer/viewport.js';
import {
  Camera,
  LookAtParams,
  createCamera,
} from '@itk-viewer/viewer/camera-machine.js';
import { SelectorController } from 'xstate-lit/dist/select-controller.js';

const PAN_SPEED = 1;
const ZOOM_SPEED = 0.0002;

const bindCamera = (
  camera: OrbitCamera,
  viewport: HTMLElement,
  onUpdate: (view: ReadonlyMat4) => unknown,
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

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();

    if (e.button === 0) {
      rotate = true;
    } else if (e.button === 1) {
      scale = true;
    } else if (e.button === 2) {
      pan = true;
    }
  };
  viewport.addEventListener('pointerdown', onPointerDown);

  const onPointerUp = (e: PointerEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      rotate = false;
    } else if (e.button === 1) {
      scale = false;
    } else if (e.button === 2) {
      pan = false;
    }
  };
  window.addEventListener('pointerup', onPointerUp);

  let prevPointerX = 0;
  let prevPointerY = 0;

  const onPointerMove = (e: PointerEvent) => {
    const pointerX = e.offsetX;
    const pointerY = e.offsetY;

    if (rotate) {
      camera.rotate(
        [pointerX / width - 0.5, pointerY / height - 0.5],
        [prevPointerX / width - 0.5, prevPointerY / height - 0.5],
      );
    }

    if (pan) {
      camera.pan([
        (PAN_SPEED * (pointerX - prevPointerX)) / width,
        (PAN_SPEED * (pointerY - prevPointerY)) / height,
      ]);
    }

    if (scale) {
      const d = pointerY - prevPointerY;
      if (d) camera.distance *= Math.exp(d / height);
    }

    prevPointerX = pointerX;
    prevPointerY = pointerY;

    if (!rotate && !pan && !scale) return;

    updateView();
  };
  viewport.addEventListener('pointermove', onPointerMove);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();

    camera.zoom(ZOOM_SPEED * camera.distance * e.deltaY);
    updateView();
  };
  viewport.addEventListener('wheel', onWheel, { passive: false });

  const preventDefault = (e: Event) => e.preventDefault();
  viewport.addEventListener('contextmenu', preventDefault);

  const unbind = () => {
    resizeObserver.disconnect();
    viewport.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    viewport.removeEventListener('pointermove', onPointerMove);
    viewport.removeEventListener('wheel', onWheel);
    viewport.removeEventListener('contextmenu', preventDefault);
  };

  updateView();

  return unbind;
};

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  viewport: Viewport | undefined;

  camera: Camera;

  lookAt: SelectorController<Camera, LookAtParams>;

  cameraController: OrbitCamera;
  unbind: (() => unknown) | undefined;

  constructor() {
    super();
    this.camera = createCamera();

    this.lookAt = new SelectorController(
      this,
      this.camera,
      (state) => state?.context.lookAt,
    );

    this.cameraController = createOrbitCamera([0, 0, -1], [0, 0, 0], [0, 1, 0]);

    const pose = this.cameraController.view();
    this.camera.send({
      type: 'setPose',
      pose,
    });
  }

  firstUpdated(): void {
    this.unbind = bindCamera(this.cameraController, this, (pose) => {
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

    const { eye, target, up } = this.lookAt.value;
    this.cameraController.lookAt(eye, target, up);
    const pose = this.cameraController.view();
    this.camera.send({
      type: 'setPose',
      pose,
    });
  }

  render() {
    return html` <slot></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-camera': ItkCamera;
  }
}
