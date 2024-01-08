import { AnyEventObject } from 'xstate';

import '@kitware/vtk.js/Rendering/Profiles/Volume';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume.js';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper.js';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction.js';

import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer.js';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow.js';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper.js';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
// import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage.js';

import { Context, SetContainerEvent } from './view-3d-vtkjs.machine.js';

const setupContainer = (
  rendererContainer: vtkGenericRenderWindow,
  container: HTMLElement,
) => {
  rendererContainer.setContainer(container as HTMLElement);
  rendererContainer.resize();

  const resizer = new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
    if (!entries.length) return;
    rendererContainer.resize();
  });
  resizer.observe(container);

  const renderer = rendererContainer.getRenderer();
  const renderWindow = rendererContainer.getRenderWindow();

  const mapper = vtkVolumeMapper.newInstance();
  mapper.setSampleDistance(0.7);
  const actor = vtkVolume.newInstance();
  actor.setMapper(mapper);

  // const iStyle = vtkInteractorStyleImage.newInstance();
  // renderWindow.getInteractor().setInteractorStyle(iStyle);

  // const camera = renderer.getActiveCamera();
  // camera.setParallelProjection(true);

  return { actor, mapper, renderer, renderWindow };
};

export const createImplementation = () => {
  let actor: vtkVolume.vtkVolume | undefined = undefined;
  let mapper: vtkVolumeMapper.vtkVolumeMapper | undefined = undefined;
  let renderer: vtkRenderer.vtkRenderer | undefined = undefined;
  let renderWindow: vtkRenderWindow.vtkRenderWindow | undefined = undefined;
  let piecewiseFunction: vtkPiecewiseFunction.vtkPiecewiseFunction | undefined =
    undefined;

  let addedActorToRenderer = false;

  const cleanupContainer = (rendererContainer: vtkGenericRenderWindow) => {
    piecewiseFunction?.delete();
    piecewiseFunction = undefined;
    mapper?.delete();
    mapper = undefined;
    actor?.delete();
    actor = undefined;
    renderer?.delete();
    renderer = undefined;
    renderWindow?.delete();
    renderWindow = undefined;
    rendererContainer.setContainer(undefined as unknown as HTMLElement);
  };

  const config = {
    actions: {
      setContainer: ({
        event,
        context: { rendererContainer },
      }: {
        event: AnyEventObject;
        context: Context;
      }) => {
        const { container } = event as SetContainerEvent;
        if (!container) {
          return cleanupContainer(rendererContainer);
        }
        const scene = setupContainer(rendererContainer, container);
        actor = scene.actor;
        mapper = scene.mapper;
        renderer = scene.renderer;
        renderWindow = scene.renderWindow;
      },

      imageBuilt: ({ event }: { event: AnyEventObject }) => {
        const { image } = event;
        const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
        mapper!.setInputData(vtkImage);

        // add actor to renderer after mapper has data to avoid vtk.js warning message
        if (!addedActorToRenderer && mapper && actor) {
          addedActorToRenderer = true;
          renderer!.addVolume(actor!);
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
          piecewiseFunction = vtkPiecewiseFunction.newInstance();
          piecewiseFunction.addPoint(min, 0.0);
          piecewiseFunction.addPoint(max, 0.5);

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
          actor.getProperty().setScalarOpacity(0, piecewiseFunction);

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
        renderer!.resetCamera();
        renderWindow!.render();
      },
    },
  };

  return config;
};
