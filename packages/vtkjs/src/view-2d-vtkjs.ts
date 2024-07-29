import { Actor, AnyEventObject } from 'xstate';
import { mat4, vec3 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume.js';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
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
import { AxisType } from '@itk-viewer/viewer/slice-utils.js';
import { ImageSnapshot } from '@itk-viewer/viewer/image.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';

const axisToSliceMode = {
  I: SlicingMode.I,
  J: SlicingMode.J,
  K: SlicingMode.K,
} as const;

const setupContainer = (
  container: HTMLElement,
  self: Actor<typeof view2dLogic>,
) => {
  const rendererContainer = GenericRenderWindow.newInstance({
    listenWindowResize: false,
  });
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

  return { actor, mapper, renderer, renderWindow, rendererContainer, resizer };
};

const createImplementation = () => {
  let actor: vtkImageSlice | undefined = undefined;
  let mapper: vtkImageMapper | undefined = undefined;
  let renderer: vtkRenderer | undefined = undefined;
  let renderWindow: vtkRenderWindow | undefined = undefined;
  let rendererContainer: vtkGenericRenderWindow | undefined = undefined;
  let resizer: ResizeObserver | undefined = undefined;

  const viewMat = mat4.create();

  const cleanupContainer = () => {
    resizer?.disconnect();
    resizer = undefined;
    actor?.delete();
    actor = undefined;
    mapper?.delete();
    mapper = undefined;
    renderer?.delete();
    renderer = undefined;
    renderWindow?.delete();
    renderWindow = undefined;
    rendererContainer?.delete();
    rendererContainer = undefined;
  };

  const render = () => {
    renderer!.resetCameraClippingRange();
    renderWindow!.render();
  };

  const config = {
    actions: {
      setContainer: ({
        event,
        self,
      }: {
        event: AnyEventObject;
        context: Context;
        self: unknown; // Actor<typeof view2dLogic>
      }) => {
        cleanupContainer();

        const { container } = event as SetContainerEvent;
        if (!container) return;

        const scene = setupContainer(
          container,
          self as Actor<typeof view2dLogic>,
        );

        actor = scene.actor;
        mapper = scene.mapper;
        renderer = scene.renderer;
        renderWindow = scene.renderWindow;
        rendererContainer = scene.rendererContainer;
        resizer = scene.resizer;
      },
      applyBuiltImage: (
        _: unknown,
        {
          image,
          sliceIndex,
        }: {
          image: BuiltImage;
          sliceIndex: number;
        },
      ) => {
        if (!mapper || !renderer) return;
        const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
        mapper.setInputData(vtkImage);
        mapper.setSlice(sliceIndex);

        // add actor to renderer after mapper has data to avoid vtkjs message
        if (actor && !renderer.getActors().includes(actor)) {
          renderer.addActor(actor!);
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
      applyAxis: (_: unknown, { axis }: { axis: AxisType }) => {
        mapper?.setSlicingMode(axisToSliceMode[axis]);
      },
      imageSnapshot: (_: unknown, state: ImageSnapshot) => {
        if (!actor) return;
        const { colorRanges } = state.context;
        if (colorRanges.length === 0) return;
        const range = colorRanges[0];
        const window = Math.abs(range[1] - range[0]);
        const level = range[0] + window / 2;
        const property = actor.getProperty();
        property.setColorWindow(window);
        property.setColorLevel(level);
        render();
      },
    },
  };

  return config;
};

export const createLogic = () => {
  return view2dLogic.provide(createImplementation());
};
