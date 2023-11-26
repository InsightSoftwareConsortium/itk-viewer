import { assign, createMachine, fromPromise, sendParent, sendTo } from 'xstate';
import { viewportMachine } from './viewport-machine.js';

const context = {
  slice: 0,
  imageScale: 0,
};

export const view2d = createMachine(
  {
    types: {} as {
      context: typeof context;
    },
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
                return { context, image };
              },
              src: fromPromise(
                async ({
                  input: {
                    context: { imageScale },
                    image,
                  },
                }) => {
                  const builtImage = await image.getImage(imageScale);
                  return builtImage;
                },
              ),

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
  },
  {
    actors: {
      viewport: viewportMachine,
    },
  },
);
