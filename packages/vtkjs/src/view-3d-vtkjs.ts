import { ActorRefFrom, AnyEventObject } from 'xstate';
import { mat4 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume.js';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume.js';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper.js';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkBoundingBox from '@kitware/vtk.js/Common/DataModel/BoundingBox';

import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer.js';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow.js';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper.js';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';

import { getNodes } from '@itk-viewer/transfer-function-editor/PiecewiseUtils.js';
import { SetContainerEvent, view3dLogic } from './view-3d-vtkjs.machine.js';
import { ReadonlyPose, toMat4 } from '@itk-viewer/viewer/camera.js';
import { ImageSnapshot } from '@itk-viewer/viewer/image.js';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';

const setupContainer = (
  container: HTMLElement,
  self: ActorRefFrom<typeof view3dLogic>,
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

  renderWindow.getInteractor().setInteractorStyle(undefined);

  const mapper = vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(0.7);
  const actor = vtkVolume.newInstance();
  actor.setMapper(mapper);

  return { actor, mapper, renderer, renderWindow, rendererContainer, resizer };
};

const createImplementation = () => {
  let opacityFunction: vtkPiecewiseFunction | undefined = undefined;
  let actor: vtkVolume | undefined = undefined;
  let mapper: vtkVolumeMapper | undefined = undefined;
  let renderer: vtkRenderer | undefined = undefined;
  let renderWindow: vtkRenderWindow | undefined = undefined;
  let rendererContainer: vtkGenericRenderWindow | undefined = undefined;
  let resizer: ResizeObserver | undefined = undefined;

  const viewMat = mat4.create();

  const cleanupContainer = () => {
    mapper?.delete();
    mapper = undefined;
    actor?.delete();
    actor = undefined;
    renderer?.delete();
    renderer = undefined;
    renderWindow?.delete();
    renderWindow = undefined;
    resizer?.disconnect();
    resizer = undefined;
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
        self: unknown; // Actor<typeof view3dLogic>
      }) => {
        const { container } = event as SetContainerEvent;
        if (!container) {
          return cleanupContainer();
        }
        const scene = setupContainer(
          container,
          self as ActorRefFrom<typeof view3dLogic>,
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
        }: {
          image: BuiltImage;
        },
      ) => {
        if (!mapper || !renderer) return; // have not set container yet
        const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
        mapper.setInputData(vtkImage);

        // add actor to renderer after mapper has data to avoid vtk.js warning message
        if (actor && !renderer.getActors().includes(actor)) {
          renderer.addVolume(actor);
          const sampleDistance =
            0.7 *
            Math.sqrt(
              vtkImage
                .getSpacing()
                .map((v) => v * v)
                .reduce((a, b) => a + b, 0),
            );
          mapper.setSampleDistance(sampleDistance);

          const dataArray =
            vtkImage.getPointData().getScalars() ||
            vtkImage.getPointData().getArrays()[0];
          const [min, max] = dataArray.getRange();
          opacityFunction = vtkPiecewiseFunction.newInstance();
          actor.getProperty().setScalarOpacity(0, opacityFunction);
          opacityFunction.addPoint(min, 0.0);
          opacityFunction.addPoint(max, 0.5);

          // For better looking volume rendering
          // - distance in world coordinates a scalar opacity of 1.0
          actor
            .getProperty()
            .setScalarOpacityUnitDistance(
              0,
              vtkBoundingBox.getDiagonalLength(vtkImage.getBounds()) /
                Math.max(...vtkImage.getDimensions()),
            );

          // - control how we emphasize surface boundaries
          //  => max should be around the average gradient magnitude for the
          //     volume or maybe average plus one std dev of the gradient magnitude
          //     (adjusted for spacing, this is a world coordinate gradient, not a
          //     pixel gradient)
          //  => max hack: (dataRange[1] - dataRange[0]) * 0.05
          actor.getProperty().setGradientOpacityMinimumValue(0, 0);
          actor
            .getProperty()
            .setGradientOpacityMaximumValue(0, (max - min) * 0.05);

          // - Use shading based on gradient
          actor.getProperty().setShade(true);
          actor.getProperty().setUseGradientOpacity(0, true);
          // - generic good default
          actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
          actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
          actor.getProperty().setAmbient(0.2);
          actor.getProperty().setDiffuse(0.7);
          actor.getProperty().setSpecular(0.3);
          actor.getProperty().setSpecularPower(8.0);
        }

        render();
      },
      applyCameraPose: (_: unknown, { pose }: { pose: ReadonlyPose }) => {
        const cameraVtk = renderer?.getActiveCamera();
        if (!cameraVtk) return;
        toMat4(viewMat, pose);
        cameraVtk.setViewMatrix(viewMat as mat4);
        render();
      },
      imageSnapshot: (
        _: unknown,
        {
          state,
          self,
        }: { state: ImageSnapshot; self: ActorRefFrom<typeof view3dLogic> },
      ) => {
        if (!actor) return;
        const actorProperty = actor.getProperty();
        const { colorRanges, colorMaps, normalizedOpacityPoints, dataRanges } =
          state.context;

        colorMaps.forEach((colorMap, component) => {
          const ct = actorProperty.getRGBTransferFunction(component);
          const preset = vtkColorMaps.getPresetByName(colorMap);
          if (!preset) throw new Error(`Color map '${colorMap}' not found`);
          ct.applyColorMap(preset);
          ct.modified(); // applyColorMap does not always trigger modified()
          self.send({
            type: 'colorTransferFunctionApplied',
            component,
            colorTransferFunction: ct,
          });
        });

        // setMappingRange after color map for vtk.js reasons
        colorRanges.forEach((range, component) => {
          const ct = actorProperty.getRGBTransferFunction(component);
          ct.setMappingRange(...range);
        });

        normalizedOpacityPoints.forEach((points, component) => {
          const nodes = getNodes(dataRanges[component], points);
          opacityFunction?.setNodes(nodes);
        });

        render();
      },
    },
  };

  return config;
};

export const createLogic = () => {
  return view3dLogic.provide(createImplementation());
};
