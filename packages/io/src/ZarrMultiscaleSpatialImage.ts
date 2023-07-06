import { ImageType, PixelTypes } from 'itk-wasm';
import PQueue from 'p-queue';

import { bloscZarrDecompress } from '@itk-viewer/blosc-zarr/bloscZarrDecompress.js';
import { getComponentType } from '@itk-viewer/wasm-utils/dtypeUtils.js';

import MultiscaleSpatialImage from './MultiscaleSpatialImage.js';
import { ZarrStoreParser } from './ZarrStoreParser.js';
import HttpStore from './HttpStore.js';
import { CXYZT, toDimensionMap } from './dimensionUtils.js';
import { Dimension, ScaleInfo } from './types.js';
import { Dataset, DatasetWithTransformation } from './ngff-types.js';
import {
  image as imageValidator,
  IMAGE_VERSION_DEFAULT,
  NgffImage,
  Transform,
  datasetZattrs,
  zArray,
  ZArray,
} from './ngff-validator.js';

// ends with zarr and optional nested image name like foo.zarr/image1
export const isZarr = (url: string) => /zarr((\/)[\w-]+\/?)?$/.test(url);

const MAX_CONCURRENCY = 1000;
const TCZYX = Object.freeze([
  't',
  'c',
  'z',
  'y',
  'x',
]) as ReadonlyArray<Dimension>;

const composeTransforms = (
  transforms: Array<Transform> = [],
  dimCount: number
) =>
  transforms.reduce(
    ({ scale, translation }, transform) => {
      if (transform.type === 'scale') {
        const { scale: transformScale } = transform;
        return {
          scale: scale.map((s, i) => s * transformScale[i]),
          translation: translation.map((t, i) => t * transformScale[i]),
        };
      }
      if (transform.type === 'translation') {
        const { translation: transformTranslation } = transform;
        return {
          scale,
          translation: translation.map((t, i) => t + transformTranslation[i]),
        };
      }

      const _exhaustiveCheck: never = transform;
      throw new Error(`unknown transform type ${_exhaustiveCheck}`);
    },
    { scale: Array(dimCount).fill(1), translation: Array(dimCount).fill(0) }
  );

const getComposedTransformation = (
  image: NgffImage | Dataset,
  dimCount: number
) => {
  const coordinateTransformations =
    'coordinateTransformations' in image ? image.coordinateTransformations : [];
  return composeTransforms(coordinateTransformations, dimCount);
};

export const computeTransform = (
  imageMetadata: NgffImage,
  datasetMetadata: DatasetWithTransformation,
  dimCount: number
) => {
  const global = getComposedTransformation(imageMetadata, dimCount);
  const dataset = getComposedTransformation(datasetMetadata, dimCount);

  return composeTransforms(
    [
      { type: 'scale', scale: dataset.scale },
      { type: 'translation', translation: dataset.translation },
      { type: 'scale', scale: global.scale },
      { type: 'translation', translation: global.translation },
    ],
    dimCount
  );
};

// if missing coordinateTransformations, make all scales same size as finest scale
const ensureScaleTransforms = (
  datasetsWithArrayMetadata: Array<{
    dataset: Dataset;
    pixelArrayMetadata: ZArray;
  }>
) => {
  const hasDatasetCoordinateTransform = datasetsWithArrayMetadata.some(
    ({ dataset }) => dataset.coordinateTransformations
  );
  if (hasDatasetCoordinateTransform)
    return datasetsWithArrayMetadata as Array<{
      dataset: DatasetWithTransformation;
      pixelArrayMetadata: ZArray;
    }>;

  const targetSize = datasetsWithArrayMetadata[0].pixelArrayMetadata.shape;

  return datasetsWithArrayMetadata.map(({ dataset, pixelArrayMetadata }) => {
    const { shape } = pixelArrayMetadata;
    const scale = targetSize.map((target, idx) => target / shape[idx]);
    return {
      dataset: {
        ...dataset,
        coordinateTransformations: [
          { scale, type: 'scale' },
        ] as Array<Transform>,
      },
      pixelArrayMetadata,
    };
  });
};

// lazy creation of voxel/pixel/dimension coordinates array
const makeCoords = ({
  shape,
  multiscaleImage,
  dataset,
}: {
  shape: Array<number>;
  multiscaleImage: NgffImage;
  dataset: DatasetWithTransformation;
}) => {
  const axes = getAxisNames(multiscaleImage);
  const coords = new Map(
    axes.map((dim) => [dim, undefined as Float32Array | undefined])
  );

  const { scale: spacingDataset, translation: originDataset } =
    computeTransform(multiscaleImage, dataset, axes.length);

  return {
    get(dim: Dimension) {
      if (!coords.get(dim)) {
        // make array
        const dimIdx = axes.indexOf(dim);
        const spacing = spacingDataset[dimIdx];
        const origin = originDataset[dimIdx];
        const coordsPerElement = new Float32Array(shape[dimIdx]);
        for (let i = 0; i < coordsPerElement.length; i++) {
          coordsPerElement[i] = i * spacing + origin;
        }
        coords.set(dim, coordsPerElement);
      }
      return coords.get(dim) as Float32Array;
    },
    has(dim: Dimension) {
      return axes.includes(dim);
    },
  };
};

const findAxesLongNames = async ({
  dataset,
  dataSource,
  dims,
}: {
  dataset: Dataset;
  dataSource: ZarrStoreParser;
  dims: ReadonlyArray<Dimension>;
}) => {
  const upOneLevel = dataset.path.split('/').slice(0, -1).join('');
  return new Map(
    await Promise.all(
      dims.map((dim) => dataSource.getItem(`${upOneLevel}/${dim}/.zattrs`))
    ).then((dimensionsZattrs) =>
      dimensionsZattrs.map(({ long_name }, i) => [dims[i], long_name])
    )
  );
};

const getAxisNames = (image: NgffImage) => {
  if ('axes' in image)
    return image.axes.map((axis) =>
      typeof axis === 'object' ? axis.name : axis
    );

  return TCZYX; // default to TCZYX for NGFF v0.1
};

const createScaledImageInfo = async ({
  multiscaleImage,
  dataset,
  pixelArrayMetadata,
  dataSource,
  multiscaleSpatialImageVersion,
}: {
  multiscaleImage: NgffImage;
  dataset: DatasetWithTransformation;
  pixelArrayMetadata: ZArray;
  dataSource: ZarrStoreParser;
  multiscaleSpatialImageVersion: string;
}) => {
  // only fetch if version is defined to avoid 404s
  const scaleZattrsRaw =
    (multiscaleSpatialImageVersion &&
      (await dataSource.getItem(`${dataset.path}/.zattrs`))) ||
    {};
  const scaleZattrs = datasetZattrs.parse(scaleZattrsRaw);

  const dims = scaleZattrs._ARRAY_DIMENSIONS ?? getAxisNames(multiscaleImage);
  const { shape, chunks } = pixelArrayMetadata;

  const chunkSize = toDimensionMap(dims, chunks);
  const arrayShape = toDimensionMap(dims, shape);

  // only fetch if version is defined to avoid 404s
  const axesNames = multiscaleSpatialImageVersion
    ? await findAxesLongNames({ dataset, dataSource, dims })
    : undefined;

  return {
    dims,
    pixelArrayMetadata,
    name: multiscaleImage.name,
    pixelArrayPath: dataset.path,
    coords: makeCoords({ shape, multiscaleImage, dataset }),
    ranges: scaleZattrs.ranges ?? multiscaleImage.ranges,
    direction: scaleZattrs.direction ?? multiscaleImage.direction,
    axesNames,
    chunkCount: toDimensionMap(
      dims,
      dims.map((dim) => Math.ceil(arrayShape.get(dim)! / chunkSize.get(dim)!))
    ),
    chunkSize,
    arrayShape,
  };
};

const extractScaleSpacing = async (dataSource: ZarrStoreParser) => {
  const zattrs = await dataSource.getItem('.zattrs');

  const { multiscales, multiscaleSpatialImageVersion } = zattrs;

  const multiscaleImage: NgffImage = Array.isArray(multiscales)
    ? multiscales[0] // if multiple images (multiscales), just grab first one
    : multiscales;

  const schemaVersion = multiscaleImage?.version ?? IMAGE_VERSION_DEFAULT;

  if (['0.1', '0.4'].includes(schemaVersion)) {
    imageValidator[schemaVersion].parse(zattrs);
  }

  const datasetsWithArrayMetadataRaw = await Promise.all(
    multiscaleImage.datasets.map(async (dataset) => ({
      dataset,
      pixelArrayMetadata: zArray.parse(
        await dataSource.getItem(`${dataset.path}/.zarray`)
      ) as ZArray,
    }))
  );

  const datasetsWithArrayMetadata = ensureScaleTransforms(
    datasetsWithArrayMetadataRaw
  );

  const scaleInfo = await Promise.all(
    datasetsWithArrayMetadata.map(async ({ dataset, pixelArrayMetadata }) => {
      return createScaledImageInfo({
        multiscaleImage,
        dataset,
        pixelArrayMetadata,
        dataSource,
        multiscaleSpatialImageVersion,
      });
    })
  );

  const info = scaleInfo[0];

  const components = info.arrayShape.get('c') ?? 1;

  const imageType = {
    // How many spatial dimensions?  Count greater than 1, X Y Z elements because "axis" metadata not defined in ngff V0.1
    dimension: (['x', 'y', 'z'] as Array<Dimension>)
      .map((dim) => info.arrayShape.get(dim))
      .filter((dim) => dim && dim > 1).length,
    pixelType:
      components === 1 ? PixelTypes.Scalar : PixelTypes.VariableLengthVector,
    componentType: getComponentType(info.pixelArrayMetadata.dtype),
    components,
  };

  return { scaleInfo, imageType };
};

export class ZarrMultiscaleSpatialImage extends MultiscaleSpatialImage {
  // Store parameter is object with getItem (but not a ZarrStoreParser)
  static async fromStore(
    store: HttpStore,
    maxConcurrency: number | undefined = undefined
  ) {
    const zarrStoreParser = new ZarrStoreParser(store);
    const { scaleInfo, imageType } = await extractScaleSpacing(zarrStoreParser);
    return new ZarrMultiscaleSpatialImage(
      zarrStoreParser,
      scaleInfo,
      imageType,
      maxConcurrency
    );
  }

  static async fromUrl(
    url: URL,
    maxConcurrency: number | undefined = undefined
  ) {
    return ZarrMultiscaleSpatialImage.fromStore(
      new HttpStore(url),
      maxConcurrency
    );
  }

  dataSource: ZarrStoreParser;
  rpcQueue: PQueue;

  // Use static factory functions to construct
  constructor(
    zarrStoreParser: ZarrStoreParser,
    scaleInfos: Array<ScaleInfo>,
    imageType: ImageType,
    maxConcurrency: number | undefined = undefined
  ) {
    super(scaleInfos, imageType);
    this.dataSource = zarrStoreParser;

    const concurrency = Math.min(
      window.navigator.hardwareConcurrency,
      maxConcurrency ?? MAX_CONCURRENCY
    );
    this.rpcQueue = new PQueue({ concurrency });
  }

  async getChunksImpl(scale: number, cxyztArray: Array<Array<number>>) {
    const info = this.scaleInfos[scale];
    const chunkPathBase = info.pixelArrayPath;
    const chunkPaths = [];
    const chunkPromises = [];

    const { dimension_separator: dimSeparator = '.' } = info.pixelArrayMetadata
      ? info.pixelArrayMetadata
      : {};

    for (let index = 0; index < cxyztArray.length; index++) {
      let chunkPath = `${chunkPathBase}/`;
      for (let dd = 0; dd < info.dims.length; dd++) {
        const dim = info.dims[dd];
        chunkPath = `${chunkPath}${
          cxyztArray[index][CXYZT.indexOf(dim)]
        }${dimSeparator}`;
      }
      chunkPath = chunkPath.slice(0, -1);
      chunkPaths.push(chunkPath);
      chunkPromises.push(() => this.dataSource.getItem(chunkPath));
    }
    const compressedChunks = await this.rpcQueue.addAll(chunkPromises);

    const toDecompress = [];
    for (let index = 0; index < compressedChunks.length; index++) {
      toDecompress.push({
        data: compressedChunks[index],
        metadata: info.pixelArrayMetadata,
      });
    }

    return bloscZarrDecompress(toDecompress) as Promise<Array<ArrayBuffer>>;
  }
}
