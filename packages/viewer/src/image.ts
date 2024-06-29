import { ActorRefFrom, assign, setup } from 'xstate';
import {
  BuiltImage,
  MultiscaleSpatialImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';

type Context = {
  image: MultiscaleSpatialImage;
  dataRanges: Array<readonly [number, number]>; // by component
};

export const image = setup({
  types: {} as {
    input: MultiscaleSpatialImage;
    context: Context;
    events: { type: 'builtImage'; builtImage: BuiltImage };
  },
  actions: {},
}).createMachine({
  id: 'camera',
  initial: 'active',
  context: ({ input: image }) => ({
    image,
    dataRanges: [],
  }),
  states: {
    active: {
      on: {
        builtImage: {
          actions: assign({
            dataRanges: ({ context, event }) => {
              const {
                builtImage: { ranges },
              } = event;
              if (!ranges) return context.dataRanges;
              return ranges.map((range, component) => {
                // only grow range
                const oldRange = context.dataRanges?.[component] ?? [
                  Number.POSITIVE_INFINITY,
                  Number.NEGATIVE_INFINITY,
                ];
                return [
                  Math.min(range[0], oldRange[0]),
                  Math.max(range[1], oldRange[1]),
                ] as const;
              });
            },
          }),
        },
      },
    },
  },
});

export type Image = ActorRefFrom<typeof image>;
export type ImageSnapshot = ReturnType<Image['getSnapshot']>;
