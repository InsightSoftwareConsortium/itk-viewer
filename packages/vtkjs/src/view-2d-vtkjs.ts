import { AnyEventObject } from 'xstate';
import { mat4 } from 'gl-matrix';

import '@kitware/vtk.js/Rendering/Profiles/Volume';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper.js';
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

      imageBuilt: ({
        event,
        context,
      }: {
        event: AnyEventObject;
        context: Context;
      }) => {
        const { image } = event;
        const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
        mapper!.setInputData(vtkImage);

        // add actor to renderer after mapper has data to avoid vtkjs message
        if (!addedActorToRenderer) {
          addedActorToRenderer = true;
          renderer!.addActor(actor!);

          const snap = context.camera!.getSnapshot();
          toMat4(viewMat, snap.context.pose);
          const cameraVtk = renderer!.getActiveCamera();
          cameraVtk.setViewMatrix(viewMat as mat4);
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
        toMat4(viewMat, pose);
        cameraVtk.setViewMatrix(viewMat as mat4);
        cameraVtk.setParallelScale(parallelScaleRatio * pose.distance);

        render();
      },
    },
  };

  return config;
};

export const createLogic = () => {
  return view2dLogic.provide(createImplementation());
};
