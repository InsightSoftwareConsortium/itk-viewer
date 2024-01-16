import {
  ActorRefFrom,
  AnyActorRef,
  assign,
  createActor,
  raise,
  setup,
} from 'xstate';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { CreateChild } from './children.js';

type SetImageEvent = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
  name?: string;
};

type SendImageToViewports = {
  type: 'sendImageToViewports';
  image: MultiscaleSpatialImage;
};

type Context = {
  spawned: Record<string, AnyActorRef>;
  images: Record<string, MultiscaleSpatialImage>;
};

export const viewerMachine = setup({
  types: {} as {
    context: Context;
    events: SetImageEvent | CreateChild | SendImageToViewports;
  },
}).createMachine({
  id: 'viewer',
  initial: 'active',
  context: {
    spawned: {},
    images: {},
  },
  states: {
    active: {
      on: {
        createChild: {
          actions: [
            assign({
              spawned: ({
                spawn,
                context: { spawned },
                event: { logic, onActor },
              }) => {
                const child = spawn(logic);
                const id = Object.keys(spawned).length.toString();
                onActor(child);
                return {
                  ...spawned,
                  [id]: child,
                };
              },
            }),
          ],
        },
        setImage: {
          actions: [
            assign({
              images: ({ event: { image, name = 'image' }, context }) => ({
                ...context.images,
                [name]: image,
              }),
            }),
            raise(({ context }) => ({
              type: 'sendImageToViewports' as const,
              image: Object.values(context.images).at(-1)!,
            })),
          ],
        },
        sendImageToViewports: {
          actions: [
            ({ context, event: { image } }) => {
              Object.values(context.spawned).forEach((viewport) => {
                viewport.send({
                  type: 'setImage',
                  image,
                });
              });
            },
          ],
        },
      },
    },
  },
});

export const createViewer = () => {
  return createActor(viewerMachine).start();
};

export type Viewer = ActorRefFrom<typeof viewerMachine>;
