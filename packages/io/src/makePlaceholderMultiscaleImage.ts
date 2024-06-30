import { IntTypes, PixelTypes } from 'itk-wasm';

import MultiscaleSpatialImage from './MultiscaleSpatialImage.js';
import { Dimension } from './types.js';

const makeScaleInfo = (image: string) => {
  return {
    dims: ['x', 'y', 'z'] as ReadonlyArray<Dimension>,
    pixelArrayMetadata: {
      shape: [-1],
      chunks: [-1],
      dtype: 'uint8',
      compressor: {
        cname: 'raw',
        blocksize: -1,
        clevel: -1,
        shuffle: -1,
      },
    },
    name: image,
    pixelArrayPath: '',
    coords: new Map(),
    ranges: [[-1, 0] as const],
    direction: [],
    axesNames: [],
    chunkCount: new Map(),
    chunkSize: new Map(),
    arrayShape: new Map(),
  };
};

export const makePlaceholderMultiscaleImage = (
  name: string,
  scaleCount: number,
) => {
  const scaleInfos = Array.from({ length: scaleCount }, () =>
    makeScaleInfo(name),
  );
  const imageType = {
    dimension: 2,
    componentType: IntTypes.UInt8,
    pixelType: PixelTypes.Scalar,
    components: 0,
  };

  const multiscaleImage = new MultiscaleSpatialImage(
    scaleInfos,
    imageType,
    name,
  );
  return multiscaleImage;
};
