import {
  ActorRefFrom,
  AnyActorLogic,
  assertEvent,
  assign,
  createMachine,
  raise,
} from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { viewportMachine } from './viewport-machine.js';

type ViewportActor = ActorRefFrom<typeof viewportMachine>;

type AddViewportEvent = {
  type: 'addViewport';
  name: string;
  viewport: ViewportActor;
};

type CreateViewport = {
  type: 'createViewport';
  logic: AnyActorLogic;
};

type SetImageEvent = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
  name?: string;
};

type SendImageToViewports = {
  type: 'sendImageToViewports';
  image: MultiscaleSpatialImage;
};

type context = {
  lastId: string;
  viewports: Record<string, ActorRefFrom<AnyActorLogic>>;
  images: Record<string, MultiscaleSpatialImage>;
};

export const viewerMachine = createMachine({
  types: {} as {
    context: context;
    events:
      | AddViewportEvent
      | SetImageEvent
      | CreateViewport
      | SendImageToViewports;
  },
  id: 'viewer',
  initial: 'active',
  context: {
    lastId: '0',
    viewports: {},
    images: {},
  },
  states: {
    active: {
      on: {
        addViewport: {
          actions: assign({
            viewports: ({
              event: { name, viewport },
              context,
            }: {
              event: AddViewportEvent;
              context: context;
            }) => ({
              ...context.viewports,
              [name]: viewport,
            }),
          }),
        },
        createViewport: {
          actions: [
            assign({
              lastId: ({ context }) => String(Number(context.lastId) + 1),
            }),
            assign({
              viewports: ({ spawn, event, context }) => {
                assertEvent(event, 'createViewport');
                const { logic } = event;
                const id = context.lastId;
                const view = spawn(logic, { id });
                return {
                  ...context.viewports,
                  [id]: view,
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
              Object.values(context.viewports).forEach((viewport) => {
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
