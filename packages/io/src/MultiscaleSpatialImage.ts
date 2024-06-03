/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  mat4,
  vec3,
  mat3,
  ReadonlyMat3,
  ReadonlyVec3,
  ReadonlyMat4,
} from 'gl-matrix';
import { ImageType, TypedArray } from 'itk-wasm';
import * as Comlink from 'comlink';

import { getDtype } from '@itk-viewer/utils/dtypeUtils.js';
import { Bounds, ReadonlyBounds } from '@itk-viewer/utils/bounding-box.js';
import { componentTypeToTypedArray } from './componentTypeToTypedArray.js';
import {
  chunk,
  CXYZT,
  ensuredDims,
  nonNullable,
  orderBy,
  XYZ,
} from './dimensionUtils.js';
import { transformBounds } from './transformBounds.js';
import {
  ChunkParameter,
  Dimension,
  Extent,
  ReadOnlyDimensionBounds,
  ScaleInfo,
  SpatialDimensions,
  TypedArrayConstructor,
} from './types.js';

// from itk-wasm
function setMatrixElement(
  matrixData: TypedArray,
  columns: number,
  row: number,
  column: number,
  value: number | bigint,
): void {
  matrixData[column + row * columns] = value;
}

type ReadonlyFloatArray =
  | Readonly<Float32Array>
  | Readonly<Float64Array>
  | ReadonlyMat3;

type ImageDataFromChunksWorkerArgs = {
  scaleInfo: {
    chunkSize: Map<Dimension, number>;
    arrayShape: Map<Dimension, number>;
    dtype: string;
  };
  imageType: ImageType;
  chunkIndices: number[][];
  chunks: ArrayBuffer[];
  indexStart: Map<Dimension, number>;
  indexEnd: Map<Dimension, number>;
  areRangesNeeded: boolean;
};

type ImageDataFromChunksProxy = {
  imageDataFromChunks: (
    args: ImageDataFromChunksWorkerArgs,
  ) => Promise<{ pixelArray: ArrayBuffer; ranges: Array<number> | undefined }>;
};
const imageDataFromChunksWorker = new Worker(
  new URL('./ImageDataFromChunks.worker.js', import.meta.url),
  { type: 'module' },
);
const imageDataFromChunksProxy = Comlink.wrap<ImageDataFromChunksProxy>(
  imageDataFromChunksWorker,
);

function inflate(bounds: Bounds, delta: number) {
  bounds[0] -= delta;
  bounds[1] += delta;
  bounds[2] -= delta;
  bounds[3] += delta;
  bounds[4] -= delta;
  bounds[5] += delta;
  return bounds;
}

// code modified from vtk.js/ImageData
const extentToBounds = (extent: Extent, indexToWorld: ReadonlyMat4) => {
  const ex = extent;
  // prettier-ignore
  const corners = [
    ex[0], ex[2], ex[4],
    ex[1], ex[2], ex[4],
    ex[0], ex[3], ex[4],
    ex[1], ex[3], ex[4],
    ex[0], ex[2], ex[5],
    ex[1], ex[2], ex[5],
    ex[0], ex[3], ex[5],
    ex[1], ex[3], ex[5]];

  const idx = new Float32Array([corners[0], corners[1], corners[2]]);
  const vout = new Float32Array(3);
  vec3.transformMat4(vout, idx, indexToWorld);
  const bounds = [
    vout[0],
    vout[0],
    vout[1],
    vout[1],
    vout[2],
    vout[2],
  ] as Bounds;
  for (let i = 3; i < 24; i += 3) {
    vec3.set(idx, corners[i], corners[i + 1], corners[i + 2]);
    vec3.transformMat4(vout, idx, indexToWorld);
    if (vout[0] < bounds[0]) {
      bounds[0] = vout[0];
    }
    if (vout[1] < bounds[2]) {
      bounds[2] = vout[1];
    }
    if (vout[2] < bounds[4]) {
      bounds[4] = vout[2];
    }
    if (vout[0] > bounds[1]) {
      bounds[1] = vout[0];
    }
    if (vout[1] > bounds[3]) {
      bounds[3] = vout[1];
    }
    if (vout[2] > bounds[5]) {
      bounds[5] = vout[2];
    }
  }

  return bounds;
};

// returns a copy
export const ensure3dDirection = (
  maybe2dDirection: ReadonlyFloatArray,
): mat3 => {
  const d = maybe2dDirection;
  if (d.length >= 9) {
    return mat3.fromValues(
      d[0],
      d[1],
      d[2],
      d[3],
      d[4],
      d[5],
      d[6],
      d[7],
      d[8],
    );
  }
  // Pad 2D with Z dimension
  return mat3.fromValues(d[0], d[1], 0, d[2], d[3], 0, 0, 0, 1);
};

const makeMat4 = ({
  direction,
  origin,
  spacing,
}: {
  direction: ReadonlyMat3;
  origin: ReadonlyVec3;
  spacing: ReadonlyVec3;
}) => {
  const mat = mat4.create();
  mat4.fromTranslation(mat, origin);

  mat[0] = direction[0];
  mat[1] = direction[1];
  mat[2] = direction[2];
  mat[4] = direction[3];
  mat[5] = direction[4];
  mat[6] = direction[5];
  mat[8] = direction[6];
  mat[9] = direction[7];
  mat[10] = direction[8];

  return mat4.scale(mat, mat, spacing);
};

type Maybe2dVec =
  | [number, number]
  | [number, number, number]
  | vec3
  | Array<number>;

const maybe2dSpatialToMat4 = ({
  direction: inDirection,
  origin,
  spacing,
}: {
  direction: ReadonlyFloatArray;
  origin: Maybe2dVec;
  spacing: Maybe2dVec;
}) => {
  const inDirection3d = ensure3dDirection(inDirection);
  // ITK (and VTKMath) uses row-major index axis, but gl-matrix uses column-major. Transpose.
  const DIMENSIONS = 3;
  const direction = Array(inDirection3d.length) as mat3;
  for (let idx = 0; idx < DIMENSIONS; ++idx) {
    for (let col = 0; col < DIMENSIONS; ++col) {
      direction[col + idx * 3] = inDirection3d[idx + col * DIMENSIONS];
    }
  }

  const origin3d = [...origin] as vec3;
  if (origin3d[2] === undefined) origin3d[2] = 0;

  const spacing3d = [...spacing] as vec3;
  if (spacing3d[2] === undefined) spacing3d[2] = 1;

  return makeMat4({ direction, origin: origin3d, spacing: spacing3d });
};

export const worldBoundsToIndexBounds = ({
  bounds,
  fullIndexBounds,
  worldToIndex,
}: {
  bounds: ReadonlyBounds | undefined;
  fullIndexBounds: ReadOnlyDimensionBounds;
  worldToIndex: ReadonlyMat4;
}) => {
  const fullIndexBoundsWithZCT = ensuredDims(
    [0, 1] as [number, number],
    CXYZT,
    fullIndexBounds,
  );
  if (!bounds) {
    // no bounds, return full image
    return fullIndexBoundsWithZCT;
  }

  const imageBounds = transformBounds(worldToIndex, bounds);
  // clamp to existing integer indexes
  const imageBoundsByDim = chunk(2, imageBounds);
  const spaceBounds = (['x', 'y', 'z'] as const).map((dim, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [min, max] = fullIndexBoundsWithZCT.get(dim)!;
    const [bmin, bmax] = imageBoundsByDim[idx];
    return [
      dim,
      [
        Math.floor(Math.min(max, Math.max(min, bmin))),
        Math.ceil(Math.min(max, Math.max(min, bmax))),
      ],
    ] as const;
  });
  const ctBounds = (['c', 't'] as const).map(
    (dim) => [dim, fullIndexBoundsWithZCT.get(dim)!] as const,
  );
  return new Map([...spaceBounds, ...ctBounds]);
};

// Ensures CXYZT dimensions are present
const ensureBoundsCXYZT = ({
  indexBounds,
  fullIndexBounds,
}: {
  indexBounds: ReadonlyBounds;
  fullIndexBounds: ReadOnlyDimensionBounds;
}) => {
  const fullIndexBoundsWithZCT = ensuredDims(
    [0, 1] as [number, number],
    CXYZT,
    fullIndexBounds,
  );
  // clamp to existing integer indexes
  const imageBoundsByDim = chunk(2, indexBounds);
  const spaceBounds = (['x', 'y', 'z'] as const).map((dim, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [min, max] = fullIndexBoundsWithZCT.get(dim)!;
    const [bmin, bmax] = imageBoundsByDim[idx];
    return [
      dim,
      [
        Math.floor(Math.min(max, Math.max(min, bmin))),
        Math.ceil(Math.min(max, Math.max(min, bmax))),
      ],
    ] as const;
  });
  const ctBounds = (['c', 't'] as const).map(
    (dim) => [dim, fullIndexBoundsWithZCT.get(dim)!] as const,
  );
  return new Map([...spaceBounds, ...ctBounds]);
};

const normalizedImageBoundsToIndexBounds = (
  arrayShape: ChunkParameter,
  normalizedImageBounds: ReadonlyBounds,
) => {
  const toIndexScale = XYZ.map((axis) => arrayShape.get(axis) ?? 1);
  const normalizedToIndex = maybe2dSpatialToMat4({
    direction: mat3.identity(mat3.create()),
    origin: vec3.create(),
    spacing: toIndexScale,
  }) as ReadonlyMat4;
  const indexBounds = transformBounds(normalizedToIndex, normalizedImageBounds);
  return indexBounds;
};

function isContained(
  benchmarkBounds: ReadOnlyDimensionBounds,
  testedBounds: ReadOnlyDimensionBounds,
) {
  return Array.from(benchmarkBounds).every(
    ([dim, [benchmarkMin, benchmarkMax]]) => {
      const testDimBounds = testedBounds.get(dim);
      if (!testDimBounds) throw new Error('Dimension not found');
      const [testedMin, testedMax] = testDimBounds;
      return benchmarkMin <= testedMin && testedMax <= benchmarkMax;
    },
  );
}

type ImageCache = Map<
  number,
  Array<{ bounds: ReadOnlyDimensionBounds; image: ImageWithMeta }>
>;

function findImageInBounds({
  cache,
  scale,
  bounds,
}: {
  cache: ImageCache;
  scale: number;
  bounds: ReadOnlyDimensionBounds;
}) {
  const imagesAtScale = cache.get(scale) ?? [];
  return imagesAtScale.find(({ bounds: cachedBounds }) =>
    isContained(cachedBounds, bounds),
  )?.image;
}

function storeImage({
  cache,
  scale,
  bounds,
  image,
}: {
  cache: ImageCache;
  scale: number;
  bounds: ReadOnlyDimensionBounds;
  image: ImageWithMeta;
}) {
  cache.set(scale, [{ bounds, image }]);
}

export class MultiscaleSpatialImage {
  // Every element corresponds to a pyramid scale
  // Lower scales, corresponds to a higher index, correspond to a lower
  // resolution.
  scaleInfos: Array<ScaleInfo> = [];
  name = 'Image';
  imageType: ImageType;
  pixelArrayType: TypedArrayConstructor;
  spatialDims: SpatialDimensions;
  cachedImages: ImageCache;

  constructor(
    scaleInfos: Array<ScaleInfo>,
    imageType: ImageType,
    name = 'Image',
  ) {
    this.scaleInfos = scaleInfos;
    this.name = name;

    this.imageType = imageType;

    const pixelType = componentTypeToTypedArray.get(imageType.componentType);
    if (!pixelType) throw new Error('Unsupported component type');

    this.pixelArrayType = pixelType;
    this.spatialDims = ['x', 'y', 'z'].slice(
      0,
      imageType.dimension,
    ) as SpatialDimensions;
    this.cachedImages = new Map();
  }

  get coarsestScale() {
    return this.scaleInfos.length - 1;
  }

  async scaleOrigin(scale: number) {
    const info = this.scaleInfos[scale];
    if (info.origin) return info.origin;

    const origin = new Array<number>(this.spatialDims.length);
    for (let index = 0; index < this.spatialDims.length; index++) {
      const dim = this.spatialDims[index];
      if (info.coords.has(dim)) {
        const coords = await info.coords.get(dim);
        if (!coords) throw new Error('No coords for dim: ' + dim);
        origin[index] = coords[0];
      } else {
        origin[index] = 0.0;
      }
    }
    info.origin = origin;
    return origin;
  }

  async scaleSpacing(scale: number) {
    const info = this.scaleInfos[scale];
    if (info.spacing) return info.spacing;

    const spacing = new Array<number>(this.spatialDims.length);
    for (let index = 0; index < this.spatialDims.length; index++) {
      const dim = this.spatialDims[index];
      const dimCoords = await info.coords.get(dim);
      if (dimCoords && dimCoords.length >= 2) {
        spacing[index] = dimCoords[1] - dimCoords[0];
      } else {
        spacing[index] = 1.0;
      }
    }
    info.spacing = spacing;
    return spacing;
  }

  get direction() {
    const dimension = this.imageType.dimension;
    const direction = new Float64Array(dimension * dimension);
    // Direction should be consistent over scales
    const infoDirection = this.scaleInfos[0].direction;
    if (infoDirection) {
      // Todo: verify this logic
      const dims = this.scaleInfos[0].dims;
      for (let d1 = 0; d1 < dimension; d1++) {
        const sd1 = this.spatialDims[d1];
        const di1 = dims.indexOf(sd1);
        for (let d2 = 0; d2 < dimension; d2++) {
          const sd2 = this.spatialDims[d2];
          const di2 = dims.indexOf(sd2);
          setMatrixElement(
            direction,
            dimension,
            d1,
            d2,
            infoDirection[di1][di2],
          );
        }
      }
    } else {
      direction.fill(0.0);
      for (let d = 0; d < dimension; d++) {
        setMatrixElement(direction, dimension, d, d, 1.0);
      }
    }

    return direction;
  }

  /* Return a promise that provides the requested chunk at a given scale and
   * chunk index. */
  protected async getChunks(scale: number, cxyztArray: Array<Array<number>>) {
    return this.getChunksImpl(scale, cxyztArray);
  }

  protected async getChunksImpl(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _scale: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cxyztArray: Array<Array<number>>,
  ): Promise<Array<ArrayBuffer>> {
    console.error('Override me in a derived class');
    return [];
  }

  async buildImage(scale: number, indexBounds: ReadOnlyDimensionBounds) {
    const { chunkSize, chunkCount, pixelArrayMetadata } =
      this.scaleInfos[scale];
    const [indexToWorld, spacing] = await Promise.all([
      this.scaleIndexToWorld(scale),
      this.scaleSpacing(scale),
    ]);

    const start = new Map(
      CXYZT.map((dim) => [dim, indexBounds.get(dim)?.[0] ?? 0]),
    );
    const end = new Map(
      CXYZT.map((dim) => [dim, (indexBounds.get(dim)?.[1] ?? 0) + 1]),
    );

    const arrayShape = new Map(
      CXYZT.map((dim) => [dim, end.get(dim)! - start.get(dim)!]),
    );

    const startXYZ = new Float32Array(
      (['x', 'y', 'z'] as const).map((dim) => start.get(dim)!),
    );
    const origin = Array.from(
      vec3
        .transformMat4(vec3.create(), startXYZ, indexToWorld)
        .slice(0, this.imageType.dimension),
    );

    const chunkSizeWith1 = ensuredDims(1, CXYZT, chunkSize);
    const l = 0;
    const zChunkStart = Math.floor(start.get('z')! / chunkSizeWith1.get('z')!);
    const zChunkEnd = Math.ceil(end.get('z')! / chunkSizeWith1.get('z')!);
    const yChunkStart = Math.floor(start.get('y')! / chunkSizeWith1.get('y')!);
    const yChunkEnd = Math.ceil(end.get('y')! / chunkSizeWith1.get('y')!);
    const xChunkStart = Math.floor(start.get('x')! / chunkSizeWith1.get('x')!);
    const xChunkEnd = Math.ceil(end.get('x')! / chunkSizeWith1.get('x')!);
    const cChunkStart = 0;
    const cChunkEnd = chunkCount.get('c') ?? 1;

    const chunkIndices = [];
    for (let k = zChunkStart; k < zChunkEnd; k++) {
      for (let j = yChunkStart; j < yChunkEnd; j++) {
        for (let i = xChunkStart; i < xChunkEnd; i++) {
          for (let h = cChunkStart; h < cChunkEnd; h++) {
            chunkIndices.push([h, i, j, k, l]);
          } // for every cChunk
        } // for every xChunk
      } // for every yChunk
    } // for every zChunk

    const chunks = await this.getChunks(scale, chunkIndices);

    const preComputedRanges = this.scaleInfos[scale].ranges;
    const args = {
      scaleInfo: {
        chunkSize: chunkSizeWith1,
        arrayShape,
        dtype: pixelArrayMetadata?.dtype ?? getDtype(this.pixelArrayType),
      },
      imageType: this.imageType,
      chunkIndices,
      chunks,
      indexStart: start,
      indexEnd: end,
      areRangesNeeded: !preComputedRanges,
    };
    const { pixelArray, ranges } =
      await imageDataFromChunksProxy.imageDataFromChunks(args);

    const size = (['x', 'y', 'z'] as const)
      .slice(0, this.imageType.dimension)
      .map((dim) => arrayShape.get(dim)!);

    return {
      imageType: this.imageType,
      name: this.scaleInfos[scale].name ?? 'Default Image Name',
      origin,
      spacing,
      direction: this.direction,
      size,
      data: pixelArray,
      ranges: preComputedRanges ?? ranges,
      metadata: new Map(),
    };
  }

  async scaleIndexToWorld(requestedScale: number) {
    const scale = Math.min(requestedScale, this.scaleInfos.length - 1);
    if (this.scaleInfos[scale].indexToWorld)
      return this.scaleInfos[scale].indexToWorld as ReadonlyMat4;

    // compute and cache origin/scale on info
    const [origin, spacing] = await Promise.all([
      this.scaleOrigin(scale),
      this.scaleSpacing(scale),
    ]);

    const indexToWorld = maybe2dSpatialToMat4({
      direction: this.direction,
      origin,
      spacing,
    }) as ReadonlyMat4;
    this.scaleInfos[scale].indexToWorld = indexToWorld;
    return indexToWorld;
  }

  async buildAndCacheImage(scale: number, indexBounds: Bounds) {
    const indexBoundsCXYZT = ensureBoundsCXYZT({
      indexBounds,
      fullIndexBounds: this.getIndexBounds(scale),
    });
    const { dims } = this.scaleInfos[scale];
    const indexBoundsByDimension = orderBy(dims)(indexBoundsCXYZT);
    const cachedImage = findImageInBounds({
      cache: this.cachedImages,
      scale,
      bounds: indexBoundsByDimension,
    });
    if (cachedImage) return cachedImage;

    const image = await this.buildImage(scale, indexBoundsByDimension);
    storeImage({
      cache: this.cachedImages,
      scale,
      bounds: indexBoundsByDimension,
      image,
    });
    return image;
  }

  /* Retrieve bounded image at scale. */
  async getImage(
    requestedScale: number,
    worldBounds: ReadonlyBounds | undefined = undefined,
  ) {
    const scale = Math.min(requestedScale, this.scaleInfos.length - 1);
    const indexToWorld = await this.scaleIndexToWorld(scale);

    const fullIndexBounds = ensuredDims(
      [0, 0],
      XYZ,
      this.getIndexBounds(scale),
    );
    let indexBounds = XYZ.flatMap((dim) => fullIndexBounds.get(dim)) as Bounds;
    if (worldBounds) {
      const worldToIndex = mat4.invert(mat4.create(), indexToWorld);
      indexBounds = transformBounds(worldToIndex, worldBounds);
    }

    return this.buildAndCacheImage(scale, indexBounds);
  }

  async getImageInImageSpace(
    scale: number,
    normalizedImageBounds: ReadonlyBounds = [0, 1, 0, 1, 0, 1],
  ) {
    const indexBounds = normalizedImageBoundsToIndexBounds(
      this.scaleInfos[scale].arrayShape,
      normalizedImageBounds,
    );
    return this.buildAndCacheImage(scale, indexBounds);
  }

  getIndexBounds(scale: number) {
    const { arrayShape } = this.scaleInfos[scale];
    return new Map(
      Array.from(arrayShape).map(([dim, size]) => [
        dim,
        [0, size - 1] as const,
      ]),
    );
  }

  getIndexExtent(scale: number) {
    const imageBounds = ensuredDims(
      [0, 1],
      ['x', 'y', 'z'],
      this.getIndexBounds(scale),
    );
    const bounds = (['x', 'y', 'z'] as const).flatMap((dim) =>
      imageBounds.get(dim),
    ) as Bounds;
    inflate(bounds, 0.5);
    return bounds;
  }

  async getWorldBounds(scale: number) {
    const indexToWorld = await this.scaleIndexToWorld(scale);
    const bounds = this.getIndexExtent(scale);
    return extentToBounds(bounds, indexToWorld);
  }
}

export default MultiscaleSpatialImage;

// bounds defaults to whole image if undefined
export const getVoxelCount = async (
  image: MultiscaleSpatialImage,
  scale: number,
  bounds: Bounds | undefined = undefined,
) => {
  const scaleInfo = image.scaleInfos[scale];

  if (!bounds) {
    return XYZ.map((dim) => scaleInfo.arrayShape.get(dim))
      .filter(nonNullable) // may not have z dim
      .reduce((voxels, dimSize) => voxels * dimSize, 1);
  }

  const indexToWorld = await image.scaleIndexToWorld(scale);
  if (!indexToWorld) throw new Error('indexToWorld is undefined');

  const fullIndexBounds = image.getIndexBounds(scale);
  const indexBounds = worldBoundsToIndexBounds({
    bounds,
    fullIndexBounds,
    worldToIndex: mat4.invert(mat4.create(), indexToWorld),
  });
  return XYZ.map((dim) => {
    const [start, end] = indexBounds.get(dim)!;
    return end - start + 1; // plus 1 as bounds are inclusive
  }).reduce((voxels, dimSize) => voxels * dimSize, 1);
};

export const getBytes = (
  { imageType: { componentType, components } }: MultiscaleSpatialImage,
  voxelCount: number,
) => {
  const bytesPerElement =
    componentTypeToTypedArray.get(componentType)!.prototype.BYTES_PER_ELEMENT;
  return bytesPerElement * components * voxelCount;
};

// union in of imageType fixes this problem https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189
export type ImageWithMeta = Awaited<
  ReturnType<MultiscaleSpatialImage['buildImage']>
>;

// union in of imageType fixes this problem https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1519138189
export type BuiltImage = Awaited<
  ReturnType<MultiscaleSpatialImage['getImage']>
> & { imageType: ImageType };
