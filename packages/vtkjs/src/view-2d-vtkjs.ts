import { AnyEventObject, createActor } from 'xstate';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper.js';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice.js';

import { view2d } from '@itk-viewer/viewer/view-2d.js';
import {
  Context,
  SetContainerEvent,
  view2dLogic,
} from './view-2d-vtkjs.machine.js';

const setContainer = (
  rendererContainer: vtkGenericRenderWindow,
  container: HTMLElement | undefined,
) => {
  rendererContainer.setContainer(container as HTMLElement);
  if (!container) {
    return;
  }
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
  actor.setMapper(mapper);

  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();

  return mapper;
};

const createConfig = () => {
  let mapper: vtkImageMapper.vtkImageMapper | undefined = undefined;

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
        mapper = setContainer(rendererContainer, container);
      },
    },
    actors: {
      view2d,
    },
  };

  return config;
};

export const createView2dVtkjs = () => {
  return view2dLogic.provide(createConfig());
};

export const createView2d = (id: string | undefined) => {
  const logic = createView2dVtkjs();
  return createActor(logic, {
    systemId: id,
  }).start();
};

export type View2dActor = ReturnType<typeof createView2d>;
