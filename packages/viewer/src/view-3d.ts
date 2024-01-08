import {
  Actor,
  AnyActorLogic,
  assign,
  enqueueActions,
  fromPromise,
  setup,
} from 'xstate';
import {
  MultiscaleSpatialImage,
  BuiltImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';

const viewContext = {
  scale: 0,
  rendererIds: [] as Array<string>,
  image: undefined as MultiscaleSpatialImage | undefined,
  lastId: '0',
};

export const view3d = setup({
  types: {} as {
    context: typeof viewContext;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setScale'; scale: number }
      | { type: 'createRenderer'; logic: AnyActorLogic };
  },
  actors: {
    imageBuilder: fromPromise(
      async ({
        input: { image, scale },
      }: {
        input: {
          image: MultiscaleSpatialImage;
          scale: number;
        };
      }) => {
        const builtImage = await image.getImage(scale);
        return builtImage as BuiltImage;
      },
    ),
  },
}).createMachine({
  context: () => {
    return JSON.parse(JSON.stringify(viewContext));
  },
  id: 'view3d',
  initial: 'view2d',
  states: {
    view2d: {
      on: {
        createRenderer: {
          actions: [
            enqueueActions(({ enqueue, event, context }) => {
              const id = String(Number(context.lastId) + 1);
              enqueue.assign({
                lastId: id,
              });
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
            assign({
              image: ({ event }) => event.image,
              scale: ({ event }) => event.image.coarsestScale,
            }),
            enqueueActions(({ context, enqueue }) => {
              context.rendererIds.forEach((id) => {
                enqueue.sendTo(id, { type: 'setImage', image: context.image });
              });
            }),
          ],
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
            input: ({ context }) => {
              const { image, scale } = context;
              if (!image) throw new Error('No image available');
              return {
                image,
                scale,
              };
            },
            src: 'imageBuilder',
            onDone: {
              actions: [
                enqueueActions(({ context, enqueue, event: { output } }) => {
                  context.rendererIds.forEach((id) => {
                    enqueue.sendTo(id, {
                      type: 'imageBuilt',
                      image: output,
                    });
                  });
                }),
              ],
            },
          },
        },
      },
    },
  },
});

export type View3dActor = Actor<typeof view3d>;
