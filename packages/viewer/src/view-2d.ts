import { assign, fromPromise, sendParent, sendTo, setup } from 'xstate';
import {
  MultiscaleSpatialImage,
  BuiltImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { viewportMachine } from './viewport-machine.js';

const context = {
  slice: 0,
  imageScale: 0,
};

export const view2d = setup({
  types: {} as {
    context: typeof context;
    events:
      | { type: 'setImage' }
      | { type: 'imageAssigned'; image: MultiscaleSpatialImage }
      | { type: 'setSlice'; slice: number };
  },
  actors: {
    viewport: viewportMachine,
    imageBuilder: fromPromise(
      async ({
        input: { imageScale, image },
      }: {
        input: { imageScale: number; image: MultiscaleSpatialImage };
      }) => {
        const builtImage = await image.getImage(imageScale);
        return builtImage as BuiltImage;
      },
    ),
  },
}).createMachine({
  context: () => JSON.parse(JSON.stringify(context)),
  id: 'view2d',
  type: 'parallel',
  states: {
    viewport: {
      invoke: {
        id: 'viewport',
        src: 'viewport',
      },
    },
    view2d: {
      on: {
        setImage: {
          actions: [sendTo('viewport', ({ event }) => event)],
        },
        imageAssigned: {
          actions: [
            assign({
              imageScale: ({ event }) => event.image.coarsestScale,
              slice: ({ event: { image } }) => {
                return image.coarsestScale;
              },
            }),
          ],
          target: '.buildingImage',
        },
      },
      initial: 'idle',
      states: {
        idle: {},
        buildingImage: {
          invoke: {
            input: ({ context, self }) => {
              const { image } = self
                .getSnapshot()
                .children.viewport.getSnapshot().context;
              return { imageScale: context.imageScale, image };
            },
            src: 'imageBuilder',
            onDone: {
              actions: [
                sendParent(({ event: { output } }) => {
                  return {
                    type: 'imageBuilt',
                    image: output,
                  };
                }),
              ],
            },
          },
        },
      },
    },
  },
});
