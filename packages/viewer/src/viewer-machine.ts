import {
  ActorRefFrom,
  AnyActorLogic,
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
  _nextId: number;
  nextId: string;
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
    _nextId: 0,
    nextId: '0',
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
              viewports: ({ spawn, event, context }) => {
                const { logic } = event as CreateViewport;
                const id = context.nextId;
                const view = spawn(logic, { id });
                return {
                  ...context.viewports,
                  [id]: view,
                };
              },
              _nextId: ({ context }) => context._nextId + 1,
              nextId: ({ context }) => String(context._nextId),
            }),
          ],
        },
        setImage: {
          actions: [
            assign({
              images: ({
                event: { image, name = 'mainImage' },
                context,
              }: {
                event: SetImageEvent;
                context: context;
              }) => ({
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
            ({ context, event }) => {
              const { image } = event as SendImageToViewports;
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
