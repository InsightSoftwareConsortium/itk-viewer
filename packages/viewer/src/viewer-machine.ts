import { assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Viewport } from './viewport.js';

type addViewportEvent = {
  type: 'addViewport';
  name: string;
  viewport: Viewport;
};

type addImageEvent = {
  type: 'addImage';
  name: string;
  image: MultiscaleSpatialImage;
};

type context = {
  viewports: Record<string, Viewport>;
  images: Record<string, MultiscaleSpatialImage>;
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
            ({
              event: { name },
              context: { images, viewports },
            }: {
              event: addImageEvent;
              context: context;
            }) => {
              Object.values(viewports).forEach((viewport) => {
                viewport.send({ type: 'setImage', image: images[name] });
              });
            },
          ],
        },
      },
    },
  },
});
