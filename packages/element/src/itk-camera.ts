import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ReadonlyQuat, ReadonlyVec3, quat, vec3 } from 'gl-matrix';
import { createArcballCamera, ArcballCamera } from '@itk-viewer/arcball';

import { Camera, Pose } from '@itk-viewer/viewer/camera.js';
import { SelectorController } from 'xstate-lit';

const PAN_SPEED = 1;
const ZOOM_SPEED = 0.001;

const bindCamera = (
  camera: ArcballCamera,
  viewport: HTMLElement,
  onUpdate: (
    center: ReadonlyVec3,
    rotation: ReadonlyQuat,
    distance: number,
  ) => unknown,
) => {
  let width = viewport.clientWidth;
  let height = viewport.clientHeight;

  const updateView = () => {
    onUpdate(camera.center, camera.rotation, camera.distance);
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

  const unBind = () => {
    resizeObserver.disconnect();
    viewport.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    viewport.removeEventListener('pointermove', onPointerMove);
    viewport.removeEventListener('wheel', onWheel);
    viewport.removeEventListener('contextmenu', preventDefault);
  };

  return unBind;
};

@customElement('itk-camera')
export class ItkCamera extends LitElement {
  @property({ attribute: false })
  actor: Camera | undefined;

  oldPose: Pose | undefined;
  pose: SelectorController<Camera, Pose> | undefined;

  cameraController: ArcballCamera;
  unBind: (() => unknown) | undefined;

  constructor() {
    super();
    this.cameraController = createArcballCamera(
      [0, 0, -1],
      [0, 0, 0],
      [0, 1, 0],
    );
  }

  firstUpdated(): void {
    this.unBind = bindCamera(
      this.cameraController,
      this,
      (center, rotation, distance) => {
        if (!this.actor) return;
        this.actor.send({
          type: 'setPose',
          pose: {
            center,
            rotation,
            distance,
          },
        });
      },
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unBind?.();
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('actor') && this.actor) {
      this.pose = new SelectorController(
        this,
        this.actor,
        (state) => state?.context.pose,
      );
    }

    if (this.pose?.value !== this.oldPose) {
      this.oldPose = this.pose?.value;
      if (this.pose?.value) {
        vec3.copy(this.cameraController.center, this.pose.value.center);
        quat.copy(this.cameraController.rotation, this.pose.value.rotation);
        this.cameraController.distance = this.pose.value.distance;
      }
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'itk-camera': ItkCamera;
  }
}
