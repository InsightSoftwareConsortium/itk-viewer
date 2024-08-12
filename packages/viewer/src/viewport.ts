import { ActorRefFrom, AnyActorRef, assign, sendParent, setup } from 'xstate';
import { ReadonlyMat4 } from 'gl-matrix';

import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { cameraMachine, Camera } from './camera.js';
import { CreateChild } from './children.js';

type Context = {
  image?: MultiscaleSpatialImage;
  camera: Camera;
  resolution: [number, number];
  views: AnyActorRef[];
};

type SetImageEvent = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
};

type SetCameraEvent = {
  type: 'setCamera';
  camera: Camera;
};

type CameraPoseUpdatedEvent = {
  type: 'cameraPoseUpdated';
  pose: ReadonlyMat4;
};

export type Events =
  | SetImageEvent
  | SetCameraEvent
  | CameraPoseUpdatedEvent
  | { type: 'setResolution'; resolution: [number, number] }
  | CreateChild;

export const viewportMachine = setup({
  types: {} as {
    context: Context;
    events: Events;
  },
  actions: {
    forwardToParent: sendParent(({ event }) => {
      return event;
    }),
    forwardToViews: ({ context, event }) => {
      context.views.forEach((actor) => {
        actor.send(event);
      });
    },
  },
}).createMachine({
  id: 'viewport',
  context: ({ spawn }) => ({
    resolution: [0, 0],
    views: [],
    camera: spawn(cameraMachine, { id: 'camera' }),
  }),
  initial: 'active',
  states: {
    active: {
      on: {
        createChild: {
          actions: [
            assign({
              views: ({
                spawn,
                context: { views },
                event: { logic, onActor },
                self,
              }) => {
                const child = spawn(logic);
                child.send({ type: 'setViewport', viewport: self });
                const { camera } = self.getSnapshot().children;
                child.send({ type: 'setCamera', camera });
                onActor(child);
                return [...views, child];
              },
            }),
          ],
        },
        setImage: {
          actions: [
            assign({
              image: ({ event: { image } }: { event: SetImageEvent }) => image,
            }),
            'forwardToViews',
          ],
        },
        setCamera: {
          actions: [
            assign({
              camera: ({ event: { camera } }: { event: SetCameraEvent }) =>
                camera,
            }),
            'forwardToViews',
          ],
        },
        setResolution: {
          actions: [
            assign({
              resolution: ({ event: { resolution } }) => resolution,
            }),
            'forwardToParent',
          ],
        },
      },
    },
  },
});

export type ViewportActor = ActorRefFrom<typeof viewportMachine>;
