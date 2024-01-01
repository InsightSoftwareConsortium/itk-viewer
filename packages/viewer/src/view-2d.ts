import {
  Actor,
  AnyActorLogic,
  assign,
  enqueueActions,
  fromPromise,
  sendParent,
  setup,
} from 'xstate';
import {
  MultiscaleSpatialImage,
  BuiltImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';

let nextChildId = 0;

const context = {
  slice: 0.5,
  scale: 0,
  rendererIds: [] as Array<string>,
  image: undefined as MultiscaleSpatialImage | undefined,
};

export const view2d = setup({
  types: {} as {
    context: typeof context;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'imageAssigned'; image: MultiscaleSpatialImage }
      | { type: 'setSlice'; slice: number }
      | { type: 'setScale'; scale: number }
      | { type: 'addRenderer'; logic: AnyActorLogic };
  },
  actors: {
    imageBuilder: fromPromise(
      async ({
        input: { image, scale, slice },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
          slice: number;
        };
      }) => {
        const worldBounds = await image.getWorldBounds(scale);
        const zWidth = worldBounds[5] - worldBounds[4];
        const worldZ = worldBounds[4] + zWidth * slice;
        worldBounds[4] = worldZ;
        worldBounds[5] = worldZ;
        const builtImage = await image.getImage(scale, worldBounds);
        return builtImage as BuiltImage;
      },
    ),
  },
}).createMachine({
  context: () => {
    return JSON.parse(JSON.stringify(context));
  },
  id: 'view2d',
  initial: 'view2d',
  states: {
    view2d: {
      on: {
        addRenderer: {
          actions: [
            enqueueActions(({ enqueue, event }) => {
              const id = String(nextChildId++);
              // @ts-expect-error cannot spawn actor of type that is not in setup()
              enqueue.spawnChild(event.logic, { id });
              enqueue.assign({
                rendererIds: ({ context: { rendererIds } }) => [
                  ...rendererIds,
                  id,
                ],
              });
            }),
          ],
        },
        setImage: {
          actions: [
            assign({ image: ({ event }) => event.image }),
            enqueueActions(({ context, enqueue }) => {
              context.rendererIds.forEach((id) => {
                enqueue.sendTo(id, { type: 'setImage', image: context.image });
              });
            }),
          ],
        },
        imageAssigned: {
          actions: [
            assign({
              scale: ({ event }) => event.image.coarsestScale,
              slice: () => {
                return 0.5;
              },
            }),
          ],
          target: '.buildingImage',
        },
        setSlice: {
          actions: [assign({ slice: ({ event }) => event.slice })],
          target: '.buildingImage',
        },
        setScale: {
          actions: [assign({ scale: ({ event }) => event.scale })],
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
              return {
                image,
                scale: context.scale,
                slice: context.slice,
              };
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

export type View2dActor = Actor<typeof view2d>;
