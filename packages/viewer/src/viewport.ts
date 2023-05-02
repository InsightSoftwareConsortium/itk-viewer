import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

export const createViewport = () => {
  return {
    image: undefined as MultiscaleSpatialImage | undefined,
  };
};

export type Viewport = ReturnType<typeof createViewport>;
