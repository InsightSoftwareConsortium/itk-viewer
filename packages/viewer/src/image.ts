import { ActorRefFrom, AnyActorRef, assign, setup } from 'xstate';
import {
  BuiltImage,
  MultiscaleSpatialImage,
} from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Range, Ranges, ReadonlyRange } from '@itk-viewer/io/types.js';

const NORMALIZED_RANGE_DEFAULT = [0.2, 0.8] as const;
const NORMALIZED_OPACITY_POINTS_DEFAULT = [
  [0.2, 0.1] as const,
  [0.8, 0.8] as const,
];

const computeColorRange = (
  dataRange: ReadonlyRange,
  normalizedRange: ReadonlyRange,
) => {
  const delta = dataRange[1] - dataRange[0];
  return normalizedRange.map((bound) => {
    return bound * delta + dataRange[0];
  }) as Range;
};

const computeNormalizedColorRange = (
  dataRange: ReadonlyRange,
  colorRange: ReadonlyRange,
) => {
  const delta = dataRange[1] - dataRange[0];
  return colorRange.map((bound) => {
    return (bound - dataRange[0]) / delta;
  }) as Range;
};

type Point = readonly [number, number];

const computeNormalizedOpacityPoints = (
  dataRange: ReadonlyRange,
  opacityPoints: Point[],
) => {
  return opacityPoints.map(([x, y]) => {
    const delta = dataRange[1] - dataRange[0];
    return [(x - dataRange[0]) / delta, y];
  }) as Point[];
};

const computeOpacityPoints = (
  dataRange: ReadonlyRange,
  normalizedPoints: Point[],
) => {
  const delta = dataRange[1] - dataRange[0];
  return normalizedPoints.map(([x, y]) => {
    return [x * delta + dataRange[0], y] as Point;
  });
};

type Context = {
  image: MultiscaleSpatialImage;
  dataRanges: Ranges; // by component
  colorRanges: Ranges;
  normalizedColorRanges: Ranges;
  opacityPoints: Point[][];
  normalizedOpacityPoints: Point[][];
};

export const image = setup({
  types: {} as {
    input: MultiscaleSpatialImage;
    context: Context;
    events:
      | { type: 'getWorker'; receiver: AnyActorRef }
      | { type: 'builtImage'; builtImage: BuiltImage }
      | {
          type: 'normalizedColorRange';
          range: readonly [number, number];
          component: number;
        }
      | {
          type: 'normalizedOpacityPoints';
          points: [number, number][];
          component: number;
        };
  },
  actions: {
    updateColorRanges: assign({
      colorRanges: ({ context: { dataRanges, normalizedColorRanges } }) => {
        return dataRanges.map((range, component) => {
          return computeColorRange(range, normalizedColorRanges[component]);
        });
      },
    }),
    updateOpacityPoints: assign({
      opacityPoints: ({ context: { dataRanges, normalizedOpacityPoints } }) => {
        return dataRanges.map((range, component) => {
          return computeOpacityPoints(
            range,
            normalizedOpacityPoints[component],
          );
        });
      },
    }),
  },
}).createMachine({
  id: 'image',
  initial: 'active',
  context: ({ input: image }) => ({
    image,
    dataRanges: [],
    colorRanges: [],
    normalizedColorRanges: [],
    opacityPoints: [],
    normalizedOpacityPoints: [],
  }),
  states: {
    active: {
      on: {
        builtImage: {
          actions: [
            assign({
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
            assign({
              normalizedColorRanges: ({ context }) => {
                return context.dataRanges.map((dataRange, component) => {
                  if (!context.normalizedColorRanges[component])
                    return NORMALIZED_RANGE_DEFAULT;
                  // if data range changes
                  // scale normalizedColorRange so colorRanges doesn't change
                  const colorRange = context.colorRanges[component];
                  return computeNormalizedColorRange(dataRange, colorRange);
                });
              },
              normalizedOpacityPoints: ({ context }) => {
                return context.dataRanges.map((dataRange, component) => {
                  if (!context.normalizedOpacityPoints[component])
                    return NORMALIZED_OPACITY_POINTS_DEFAULT;
                  // if data range changes
                  // scale normalizedPoints so opacityPoints doesn't change
                  const points = context.opacityPoints[component];
                  const normalized = computeNormalizedOpacityPoints(
                    dataRange,
                    points,
                  );
                  return normalized;
                });
              },
            }),
            'updateColorRanges',
            'updateOpacityPoints',
          ],
        },
        normalizedColorRange: {
          actions: [
            assign({
              normalizedColorRanges: ({ context, event }) => {
                context.normalizedColorRanges[event.component] = event.range;
                return context.normalizedColorRanges;
              },
            }),
            'updateColorRanges',
          ],
        },
        normalizedOpacityPoints: {
          actions: [
            assign({
              normalizedOpacityPoints: ({ context, event }) => {
                context.normalizedOpacityPoints[event.component] = event.points;
                return context.normalizedOpacityPoints;
              },
            }),
            'updateOpacityPoints',
          ],
        },
      },
    },
  },
});

export type Image = ActorRefFrom<typeof image>;
export type ImageSnapshot = ReturnType<Image['getSnapshot']>;
