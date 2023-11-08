import { createActor } from 'xstate';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import { vtkGenericRenderWindow } from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor.js';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper.js';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource.js';

import { view2d } from '@itk-viewer/viewer/view-2d.js';
import { SetContainerEvent, Context, machine } from './view-2d-machine.js';

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

  const coneSource = vtkConeSource.newInstance({ height: 1.0 });
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(coneSource.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);

  renderer.addActor(actor);
  renderer.resetCamera();
  renderWindow.render();
};
const config = {
  actions: {
    setContainer: ({
      event: { container },
      context: { rendererContainer },
    }: {
      event: SetContainerEvent;
      context: Context;
    }) => {
      setContainer(rendererContainer, container);
    },
  },
  actors: {
    view2d,
  },
};
export const view2dVtkjs = machine.provide(config);

export const createView2d = (id: string | undefined) => {
  return createActor(view2dVtkjs, {
    systemId: id,
  }).start();
};

export type View2dActor = ReturnType<typeof createView2d>;
