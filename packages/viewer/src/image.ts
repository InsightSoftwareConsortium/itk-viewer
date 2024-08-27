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
  colorMaps: string[];
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
          type: 'colorRange';
          range: readonly [number, number];
          component: number;
        }
      | {
          type: 'normalizedColorRange';
          range: readonly [number, number];
          component: number;
        }
      | {
          type: 'opacityPoints';
          points: Point[];
          component: number;
        }
      | {
          type: 'normalizedOpacityPoints';
          points: Point[];
          component: number;
        }
      | { type: 'colorMap'; colorMap: string; component: number };
  },
  actions: {
    updateColorRanges: assign({
      colorRanges: ({ context: { dataRanges, normalizedColorRanges } }) => {
        return dataRanges.map((range, component) => {
          return computeColorRange(range, normalizedColorRanges[component]);
        });
      },
    }),
    updateNormalizedColorRanges: assign({
      normalizedColorRanges: ({ context }) => {
        return context.dataRanges.map((dataRange, component) => {
          return computeNormalizedColorRange(
            dataRange,
            context.colorRanges[component],
          );
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
    updateNormalizedOpacityPoints: assign({
      normalizedOpacityPoints: ({ context }) => {
        return context.dataRanges.map((dataRange, component) => {
          return computeNormalizedOpacityPoints(
            dataRange,
            context.opacityPoints[component],
          );
        });
      },
    }),
    ensureComponentDefaults: assign({
      colorMaps: ({ context: { dataRanges, colorMaps } }) => {
        const components = Array.from(
          { length: dataRanges.length },
          (_, index) => index,
        );
        return components.map((component) => {
          const colorMap = colorMaps[component];
          if (colorMap) return colorMap;
          return 'Viridis (matplotlib)';
        });
      },
    }),
  },
}).createMachine({
  id: 'image',
  initial: 'active',
  context: ({ input: image }) => ({
    image,
    dataRanges: [], // by component
    colorRanges: [],
    normalizedColorRanges: [],
    colorMaps: [],
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
              colorRanges: ({ context }) => {
                // init color ranges if not set
                return context.dataRanges.map((dataRange, component) => {
                  if (context.colorRanges[component])
                    return context.colorRanges[component];
                  return computeColorRange(dataRange, NORMALIZED_RANGE_DEFAULT);
                });
              },
              opacityPoints: ({ context }) => {
                // init opacity points if not set
                return context.dataRanges.map((dataRange, component) => {
                  if (context.opacityPoints[component])
                    return context.opacityPoints[component];
                  return computeOpacityPoints(
                    dataRange,
                    NORMALIZED_OPACITY_POINTS_DEFAULT,
                  );
                });
              },
            }),
            'updateNormalizedColorRanges',
            'updateNormalizedOpacityPoints',
            'ensureComponentDefaults',
          ],
        },
        colorRange: {
          actions: [
            assign({
              colorRanges: ({ context, event }) => {
                context.colorRanges[event.component] = event.range;
                return [...context.colorRanges];
              },
            }),
            'updateNormalizedColorRanges',
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
        opacityPoints: {
          actions: [
            assign({
              opacityPoints: ({ context, event }) => {
                context.opacityPoints[event.component] = event.points;
                return [...context.opacityPoints];
              },
            }),
            'updateNormalizedOpacityPoints',
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
        colorMap: {
          actions: [
            assign({
              colorMaps: ({ context, event }) => {
                return [
                  ...context.colorMaps.slice(0, event.component),
                  event.colorMap,
                  ...context.colorMaps.slice(event.component + 1),
                ];
              },
            }),
          ],
        },
      },
    },
  },
});

export type Image = ActorRefFrom<typeof image>;
export type ImageSnapshot = ReturnType<Image['getSnapshot']>;
