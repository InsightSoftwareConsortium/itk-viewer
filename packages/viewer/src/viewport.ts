import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

export const createViewport = () => {
  return {
    image: undefined as MultiscaleSpatialImage | undefined,
  };
};

export type Viewport = ReturnType<typeof createViewport>;

export const update = (viewport: Viewport) => {};

export const setImage = (viewport: Viewport, image: MultiscaleSpatialImage) => {
  viewport.image = image;

  update(viewport);
};
