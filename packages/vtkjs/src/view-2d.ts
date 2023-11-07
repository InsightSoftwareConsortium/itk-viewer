import { createActor } from 'xstate';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import GenericRenderWindow, {
  vtkGenericRenderWindow,
} from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow.js';
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

export const createView2d = () => {
  // The VTK.js implementation of view2d machine
  const config = {
    actions: {
      setup: ({ context }: { context: Context }) => {
        context.rendererContainer = GenericRenderWindow.newInstance({
          listenWindowResize: false,
        });
      },
      setContainer: ({
        event: { container },
        context: { rendererContainer },
      }: {
        event: SetContainerEvent;
        context: Context;
      }) => {
        if (!rendererContainer) {
          throw new Error('rendererContainer is undefined');
        }
        setContainer(rendererContainer, container);
      },
    },
    actors: {
      view2d,
    },
  };
  const configured = machine.provide(config);
  return createActor(configured).start();
};

export type View2dActor = ReturnType<typeof createView2d>;
