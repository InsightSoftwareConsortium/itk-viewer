import { Actor, ActorRefFrom, AnyEventObject } from 'xstate';
import { mat4, vec3 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume.js';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper.js';
import { SlicingMode } from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants.js';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice.js';
import vtkImageProperty from '@kitware/vtk.js/Rendering/Core/ImageProperty.js';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
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
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction.js';

const axisToSliceMode = {
  I: SlicingMode.I,
  J: SlicingMode.J,
  K: SlicingMode.K,
} as const;

const getRGBTransferFunction = (
  actorProperty: vtkImageProperty,
  component: number,
) => {
  const func = actorProperty.getRGBTransferFunction(component);
  if (func) return func;
  const newFunc = vtkColorTransferFunction.newInstance();
  actorProperty.setRGBTransferFunction(component, newFunc);
  return newFunc;
};

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
  const actorProperty = actor.getProperty();
  actorProperty.setUseLookupTableScalarRange(true);
  actorProperty.setIndependentComponents(true);

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
      imageSnapshot: (
        _: unknown,
        {
          state,
          self,
        }: { state: ImageSnapshot; self: ActorRefFrom<typeof view2dLogic> },
      ) => {
        if (!actor) throw new Error('Vtkjs actor not created');
        const actorProperty = actor.getProperty();
        const { colorRanges, colorMaps } = state.context;

        colorMaps.forEach((colorMap, component) => {
          const colorFunc = getRGBTransferFunction(actorProperty, component);
          const preset = vtkColorMaps.getPresetByName(colorMap);
          if (!preset) throw new Error(`Color map '${colorMap}' not found`);
          colorFunc.applyColorMap(preset);
          colorFunc.modified(); // applyColorMap does not always trigger modified()
          self.send({
            type: 'colorTransferFunctionApplied',
            component,
            colorTransferFunction: colorFunc,
          });
        });

        // setMappingRange after color map for vtk.js reasons
        colorRanges.forEach((range, component) => {
          const colorFunc = getRGBTransferFunction(actorProperty, component);
          colorFunc.setMappingRange(...range);
        });

        render();
      },
    },
  };

  return config;
};

export const createLogic = () => {
  return view2dLogic.provide(createImplementation());
};
