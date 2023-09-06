import { Dimension } from './types.js';

export const CXYZT = Object.freeze(['c', 'x', 'y', 'z', 't'] as const); // viewer indexing

export const ensuredDims = <T>(
  defaultValue: T,
  ensuredDims: ReadonlyArray<Dimension>,
  dimMap: ReadonlyMap<Dimension, T>,
) =>
  ensuredDims.reduce(
    (map, dim) => map.set(dim, map.get(dim) ?? defaultValue),
    new Map(dimMap),
  );

export const toDimensionMap = <T>(
  dims: ReadonlyArray<Dimension>,
  array: Array<T>,
) => new Map(dims.map((dim, i) => [dim, array[i]]));

// example: orderBy(['y', 'x'])(new Map([['x', 1], ['y', 2], ['z', 3]])) -> Map([['y', 2], ['x', 1]])
// drops dimensions that are not in dims!
export const orderBy =
  (dims: ReadonlyArray<Dimension>) =>
  <V>(map: Map<Dimension, V>) =>
    new Map(
      dims.map((dim) => {
        const value = map.get(dim);
        if (!value) throw new Error(`Dimension ${dim} not found in map ${map}`);
        return [dim, value];
      }),
    );

export const chunkArray = <T>(chunkSize: number, array: Array<T>) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};
