import { Image } from 'itk-wasm';
import {
  MultiscaleSpatialImage,
  ensure3dDirection,
} from './MultiscaleSpatialImage.js';
import { CXYZT, chunk, orderBy, toDimensionMap } from './dimensionUtils.js';
import { Dimension } from './types.js';

class Coords {
  coords: Map<string, Float32Array>;
  constructor(image: Image, dims: Array<string>) {
    this.coords = new Map();
    let spatialDimIndex = 0;
    if (dims[0] == 'c') {
      spatialDimIndex = 1;
      const coord = new Float32Array(image.imageType.components);
      for (let c = 0; c < image.imageType.components; c++) {
        coord[c] = c;
      }
      this.coords.set('c', coord);
    }
    let spatialIndex = 0;
    for (let d = spatialDimIndex; d < dims.length; d++) {
      const size = image.size[spatialIndex];
      const origin = image.origin[spatialIndex];
      const spacing = image.spacing[spatialIndex];
      const coord = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        coord[i] = origin + i * spacing;
      }
      this.coords.set(dims[d], coord);
      spatialIndex++;
    }
  }

  async get(coord: string) {
    return this.coords.get(coord);
  }

  has(coord: string) {
    return this.coords.has(coord);
  }
}

const imageToScaleInfo = (image: Image) => {
  const imageType = image.imageType;

  const dims: Dimension[] = ['y', 'x'];
  const sizeCXYZTElements = [
    imageType.components,
    image.size[0],
    image.size[1],
    1,
    1,
  ];

  if (imageType.components > 1) {
    dims.push('c');
  }

  if (imageType.dimension == 3) {
    dims.unshift('z');
    sizeCXYZTElements[3] = image.size[2];
  }

  const sizeCXYZTChunks = [...sizeCXYZTElements];

  const orderByDims = orderBy(dims);

  const direction3d = ensure3dDirection(image.direction as Float64Array);
  const numberOfCXYZTChunks = [1, 1, 1, 1, 1];

  const scaleInfo = {
    dims,
    coords: new Coords(image, [...dims].reverse()), // Coords assumes xyz
    chunkCount: orderByDims(toDimensionMap(CXYZT, numberOfCXYZTChunks)),
    chunkSize: orderByDims(toDimensionMap(CXYZT, sizeCXYZTChunks)),
    arrayShape: orderByDims(toDimensionMap(CXYZT, sizeCXYZTElements)),
    direction: chunk(3, [...direction3d].reverse()), // reverse to cast xyz to zyx
  };
  return scaleInfo;
};

export class ItkWasmMultiscaleSpatialImage extends MultiscaleSpatialImage {
  image: Image;

  constructor(image: Image) {
    const scaleInfos = [imageToScaleInfo(image)];
    super(scaleInfos, image.imageType);
    this.image = image;
  }

  protected async getChunksImpl(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _scale: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cxyztArray: Array<Array<number>>,
  ): Promise<Array<ArrayBuffer>> {
    if (!this.image.data) {
      throw new Error('Image data is null');
    }
    return [this.image.data?.buffer];
  }
}
