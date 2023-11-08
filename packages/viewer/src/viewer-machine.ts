import { ActorRefFrom, AnyActorLogic, assign, createMachine } from 'xstate';

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

type AddImageEvent = {
  type: 'addImage';
  name: string;
  image: MultiscaleSpatialImage;
};

type context = {
  _nextId: number;
  nextId: string;
  viewports: Record<string, ActorRefFrom<AnyActorLogic>>;
  images: Record<string, MultiscaleSpatialImage>;
};

const sendToViewports = ({
  event: { name },
  context: { images, viewports },
}: {
  event: AddImageEvent;
  context: context;
}) => {
  Object.values(viewports).forEach((viewport) => {
    viewport.send({ type: 'setImage', image: images[name] });
  });
};

export const viewerMachine = createMachine({
  types: {} as {
    context: context;
    events: AddViewportEvent | AddImageEvent | CreateViewport;
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
          actions: assign({
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
        },
        addImage: {
          actions: [
            assign({
              images: ({
                event: { name, image },
                context,
              }: {
                event: AddImageEvent;
                context: context;
              }) => ({
                ...context.images,
                [name]: image,
              }),
            }),
            sendToViewports,
          ],
        },
      },
    },
  },
});
