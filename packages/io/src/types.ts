import { mat4 } from 'gl-matrix';
import { TypedArray } from 'itk-wasm';

export type ValueOf<T> = T[keyof T];
export type Awaitable<T> = Promise<T> | T;

export type Bounds = [number, number, number, number, number, number];
export type Extent = [number, number, number, number, number, number];
export type Range = [number, number];
export type ReadonlyRange = readonly [number, number];
export type Vector3 = [number, number, number];

export type Dimension = 'x' | 'y' | 'z' | 'c' | 't';
export type DimensionToRange = Map<Dimension, Range>;
export type DimensionBounds = DimensionToRange;
export type ReadOnlyDimensionBounds = ReadonlyMap<Dimension, ReadonlyRange>;
export type Direction = ReadonlyArray<ReadonlyArray<number>>;

// eslint-disable-next-line @typescript-eslint/ban-types
type Constructor<T> = Function & { prototype: T };
export type TypedArrayConstructor = Constructor<TypedArray>;

export type SpatialDimensions = ['x'] | ['x', 'y'] | ['x', 'y', 'z'];

type ChunkParameter = Map<Dimension, number>;
type LazyCoords = {
  get: (dim: Dimension) => Awaitable<Float32Array>;
  has: (dim: Dimension) => boolean;
};

export type ScaleInfo = {
  dims: ReadonlyArray<Dimension>; // valid elements: 'c', 'x', 'y', 'z', or 't'
  coords: LazyCoords; // Map<Dimension, Promise<Float32Array>>; // dimension to array of coordinates
  origin?: Array<number>; // origin of the image in physical space
  spacing?: Array<number>; // distance between voxels in physical space
  direction?: Direction; // cosine vectors in physical space

  chunkCount: ChunkParameter; // array shape in chunks
  chunkSize: ChunkParameter; // chunk shape in elements
  arrayShape: ChunkParameter; // array shape in elements
  ranges?: Array<Array<number>>; // Map('1': [0, 140], '2': [3, 130]) or null if unknown. Range of values for each component
  name?: string; // dataset name

  indexToWorld?: mat4;

  // Zarr specific
  pixelArrayMetadata?: {
    dtype?: string;
    dimension_separator?: string;
  };
  pixelArrayPath?: string;
};
