import { ActorRefFrom, assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { viewportMachine } from './viewport-machine.js';

type ViewportActor = ActorRefFrom<typeof viewportMachine>;

type addViewportEvent = {
  type: 'addViewport';
  name: string;
  viewport: ViewportActor;
};

type addImageEvent = {
  type: 'addImage';
  name: string;
  image: MultiscaleSpatialImage;
};

type context = {
  viewports: Record<string, ViewportActor>;
  images: Record<string, MultiscaleSpatialImage>;
};

const sendToViewports = ({
  event: { name },
  context: { images, viewports },
}: {
  event: addImageEvent;
  context: context;
}) => {
  Object.values(viewports).forEach((viewport) => {
    viewport.send({ type: 'setImage', image: images[name] });
  });
};

export const viewerMachine = createMachine({
  types: {} as {
    context: context;
    events: addViewportEvent | addImageEvent;
  },
  id: 'viewer',
  initial: 'active',
  context: {
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
              event: addViewportEvent;
              context: context;
            }) => ({
              ...context.viewports,
              [name]: viewport,
            }),
          }),
        },
        addImage: {
          actions: [
            assign({
              images: ({
                event: { name, image },
                context,
              }: {
                event: addImageEvent;
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
