import { Actor, AnyEventObject } from 'xstate';
import { mat4, vec3 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper.js';
import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants.js';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice.js';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer.js';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow.js';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper.js';

import { Pose, toMat4 } from '@itk-viewer/viewer/camera.js';
import {
  Context,
  SetContainerEvent,
  view2dLogic,
} from './view-2d-vtkjs.machine.js';
import { Axis } from '@itk-viewer/viewer/view-2d.js';

const axisToSliceMode = {
  I: SlicingMode.I,
  J: SlicingMode.J,
  K: SlicingMode.K,
} as const;

const setupContainer = (
  rendererContainer: vtkGenericRenderWindow,
  container: HTMLElement,
  self: Actor<typeof view2dLogic>,
) => {
  rendererContainer.setContainer(container as HTMLElement);
  rendererContainer.resize();

  const resizer = new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
    if (!entries.length) return;
    rendererContainer.resize();
    const { width, height } = entries[0].contentRect;
    self.send({ type: 'setResolution', resolution: [width, height] });
  });
  resizer.observe(container);

  const renderer = rendererContainer.getRenderer();
  const renderWindow = rendererContainer.getRenderWindow();

  const mapper = vtkImageMapper.newInstance();
  const actor = vtkImageSlice.newInstance();

  actor!.setMapper(mapper!);

  renderWindow.getInteractor().setInteractorStyle(undefined);

  const camera = renderer!.getActiveCamera();
  camera.setParallelProjection(true);

  return { actor, mapper, renderer, renderWindow };
};

const createImplementation = () => {
  let actor: vtkImageSlice.vtkImageSlice | undefined = undefined;
  let mapper: vtkImageMapper.vtkImageMapper | undefined = undefined;
  let renderer: vtkRenderer.vtkRenderer | undefined = undefined;
  let renderWindow: vtkRenderWindow.vtkRenderWindow | undefined = undefined;

  const viewMat = mat4.create();
  let addedActorToRenderer = false;

  const cleanupContainer = (rendererContainer: vtkGenericRenderWindow) => {
    actor?.delete();
    actor = undefined;
    mapper?.delete();
    mapper = undefined;
    renderer?.delete();
    renderer = undefined;
    renderWindow?.delete();
    renderWindow = undefined;
    rendererContainer.setContainer(undefined as unknown as HTMLElement);
  };

  const render = () => {
    renderer!.resetCameraClippingRange();
    renderWindow!.render();
  };

  const config = {
    actions: {
      setContainer: ({
        event,
        context: { rendererContainer },
        self,
      }: {
        event: AnyEventObject;
        context: Context;
        self: unknown; // Actor<typeof view2dLogic>
      }) => {
        const { container } = event as SetContainerEvent;
        if (!container) {
          return cleanupContainer(rendererContainer);
        }
        const scene = setupContainer(
          rendererContainer,
          container,
          self as Actor<typeof view2dLogic>,
        );
        actor = scene.actor;
        mapper = scene.mapper;
        renderer = scene.renderer;
        renderWindow = scene.renderWindow;
      },

      imageBuilt: ({
        event,
        context,
      }: {
        event: AnyEventObject;
        context: Context;
      }) => {
        const { image, sliceIndex } = event;
        const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
        mapper!.setInputData(vtkImage);
        mapper!.setSlice(sliceIndex);

        // add actor to renderer after mapper has data to avoid vtkjs message
        if (!addedActorToRenderer) {
          addedActorToRenderer = true;
          renderer!.addActor(actor!);

          const snap = context.camera?.getSnapshot();
          if (snap) {
            toMat4(viewMat, snap.context.pose);
            const cameraVtk = renderer!.getActiveCamera();
            cameraVtk.setViewMatrix(viewMat as mat4);
          } else {
            renderer!.resetCamera();
          }
        }
        render();
      },

      applyCameraPose: (
        _: unknown,
        {
          pose,
          parallelScaleRatio,
        }: { pose: Pose; parallelScaleRatio: number },
      ) => {
        const cameraVtk = renderer?.getActiveCamera();
        if (!cameraVtk) return;
        cameraVtk.setParallelScale(parallelScaleRatio * pose.distance);

        const image = mapper?.getInputData();
        if (image) {
          // ensure the camera is outside the image
          const bounds = image.getBounds();

          const center = vec3.fromValues(
            (bounds[0] + bounds[1]) / 2.0,
            (bounds[2] + bounds[3]) / 2.0,
            (bounds[4] + bounds[5]) / 2.0,
          );
          const distanceToCenter = vec3.distance(center, pose.center);

          let w1 = bounds[1] - bounds[0];
          let w2 = bounds[3] - bounds[2];
          let w3 = bounds[5] - bounds[4];
          w1 *= w1;
          w2 *= w2;
          w3 *= w3;
          let radius = w1 + w2 + w3;
          // If we have just a single point, pick a radius of 1.0
          radius = radius === 0 ? 1.0 : radius;
          // compute the radius of the enclosing sphere
          radius = Math.sqrt(radius) * 0.5;

          const ensureOutOfImageDistance = distanceToCenter + radius;

          toMat4(viewMat, { ...pose, distance: ensureOutOfImageDistance });
        } else {
          toMat4(viewMat, pose);
        }
        cameraVtk.setViewMatrix(viewMat as mat4);

        render();
      },

      axis: (_: unknown, { axis }: { axis: Axis }) => {
        mapper?.setSlicingMode(axisToSliceMode[axis]);
      },
    },
  };

  return config;
};

export const createLogic = () => {
  return view2dLogic.provide(createImplementation());
};
