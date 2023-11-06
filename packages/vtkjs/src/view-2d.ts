import { ActorRefFrom, createActor } from 'xstate';
import { view2d } from '@itk-viewer/viewer/view-2d.js';

export const createView2d = () => {
  // The VTK.js implementation of view2d machine
  const config = {
    actions: {
      setup: () => console.log('setup'),
    },
  };
  const configured = view2d.provide(config);
  return createActor(configured).start() as ActorRefFrom<typeof view2d>;
};
