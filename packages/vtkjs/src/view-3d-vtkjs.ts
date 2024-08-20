import { ActorRefFrom, AnyEventObject } from 'xstate';
import { mat4 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume.js';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume.js';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper.js';
import vtkBoundingBox from '@kitware/vtk.js/Common/DataModel/BoundingBox';

import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer.js';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow.js';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper.js';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';

import { getColorMap } from 'itk-viewer-color-maps';

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

          const actorProperty = actor.getProperty();
          actorProperty.setAmbient(0.2);
          actorProperty.setDiffuse(0.7);
          actorProperty.setSpecular(0.3);
          actorProperty.setSpecularPower(8.0);
          actorProperty.setShade(true);
          actorProperty.setIndependentComponents(true);

          Array.from(
            { length: image.imageType.components },
            (_, index) => index,
          ).forEach((component) => {
            // For better looking volume rendering
            // - distance in world coordinates a scalar opacity of 1.0
            actorProperty.setScalarOpacityUnitDistance(
              component,
              vtkBoundingBox.getDiagonalLength(vtkImage.getBounds()) /
                Math.max(...vtkImage.getDimensions()),
            );

            // - control how we emphasize surface boundaries
            //  => max should be around the average gradient magnitude for the
            //     volume or maybe average plus one std dev of the gradient magnitude
            //     (adjusted for spacing, this is a world coordinate gradient, not a
            //     pixel gradient)
            //  => max hack: (dataRange[1] - dataRange[0]) * 0.05
            const dataArray =
              vtkImage.getPointData().getScalars() ||
              vtkImage.getPointData().getArrays()[0];
            const [min, max] = dataArray.getRange(component);
            actorProperty.setGradientOpacityMinimumValue(component, 0);
            actorProperty.setGradientOpacityMaximumValue(
              component,
              (max - min) * 0.05,
            );

            // - Use shading based on gradient
            actorProperty.setUseGradientOpacity(component, true);

            // - generic good default
            actorProperty.setGradientOpacityMinimumOpacity(component, 0.0);
            actorProperty.setGradientOpacityMaximumOpacity(component, 1.0);
          });
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
          const colorFunc = actorProperty.getRGBTransferFunction(component);
          const preset = getColorMap(colorMap, component);
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
          const ct = actorProperty.getRGBTransferFunction(component);
          ct.setMappingRange(...range);
        });

        normalizedOpacityPoints.forEach((points, component) => {
          const opacityFunc = actorProperty.getScalarOpacity(component);
          const nodes = getNodes(dataRanges[component], points);
          opacityFunc.setNodes(nodes);
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
