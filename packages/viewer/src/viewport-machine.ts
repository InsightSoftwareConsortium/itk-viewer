import { assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

export const viewportMachine = createMachine({
  types: {} as {
    context: {
      image: MultiscaleSpatialImage | undefined;
    };
    events: { type: 'setImage'; image: MultiscaleSpatialImage };
  },
  id: 'viewport',
  initial: 'active',
  context: { image: undefined },
  states: {
    active: {
      on: {
        setImage: {
          actions: [
            assign({
              image: ({ event: { image } }) => image,
            }),
          ],
        },
      },
    },
  },
});
