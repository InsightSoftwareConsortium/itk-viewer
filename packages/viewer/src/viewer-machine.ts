import { assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Viewport } from './viewport.js';

export const viewerMachine = createMachine({
  types: {} as {
    context: {
      viewports: Record<string, Viewport>;
      images: Record<string, MultiscaleSpatialImage>;
    };

    events:
      | { type: 'addViewport'; name: string; viewport: Viewport }
      | { type: 'addImage'; name: string; image: MultiscaleSpatialImage };
  },
  id: 'feedback',
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
            viewports: ({ event: { name, viewport }, context }) => ({
              ...context.viewports,
              [name]: viewport,
            }),
          }),
        },
        addImage: {
          actions: assign({
            images: ({ event: { name, image }, context }) => ({
              ...context.images,
              [name]: image,
            }),
          }),
        },
      },
    },
  },
});
