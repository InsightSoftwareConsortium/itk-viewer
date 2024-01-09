import {
  Actor,
  AnyActorLogic,
  AnyActorRef,
  assign,
  enqueueActions,
  fromPromise,
  setup,
} from 'xstate';
import {
  MultiscaleSpatialImage,
  BuiltImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { CreateChild } from './children.js';

const viewContext = {
  scale: 0,
  image: undefined as MultiscaleSpatialImage | undefined,
  spawned: {} as Record<string, AnyActorRef>,
};

export const view3d = setup({
  types: {} as {
    context: typeof viewContext;
    events:
      | { type: 'setImage'; image: MultiscaleSpatialImage }
      | { type: 'setScale'; scale: number }
      | { type: 'createRenderer'; logic: AnyActorLogic }
      | CreateChild;
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
        createChild: {
          actions: [
            assign({
              spawned: ({
                spawn,
                context: { spawned },
                event: { logic, onActor },
              }) => {
                // @ts-expect-error cannot spawn actor of type that is not in setup()
                const child = spawn(logic);
                const id = Object.keys(spawned).length.toString();
                onActor(child);
                return {
                  ...spawned,
                  [id]: child,
                };
              },
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
              Object.values(context.spawned).forEach((actor) => {
                enqueue.sendTo(actor, {
                  type: 'setImage',
                  image: context.image,
                });
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
                  Object.values(context.spawned).forEach((actor) => {
                    enqueue.sendTo(actor, {
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
