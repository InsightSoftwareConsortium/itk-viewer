import { assign, createMachine } from 'xstate';

import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

type context = {
  image: MultiscaleSpatialImage | undefined;
};

type setImageEvent = {
  type: 'setImage';
  image: MultiscaleSpatialImage;
};

export const viewportMachine = createMachine({
  types: {} as {
    context: context;
    events: setImageEvent;
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
              image: ({ event: { image } }: { event: setImageEvent }) => image,
            }),
          ],
        },
      },
    },
  },
});
