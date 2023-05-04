import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Viewport } from './viewport.js';

let nextId = 0;
const createId = () => {
  return `viewport-${nextId++}` as ViewportId;
};

type ViewportId = string & { readonly brand: unique symbol };
type ImageId = string & { readonly brand: unique symbol };

export const createViewer = () => {
  return {
    viewports: {} as Record<ViewportId, Viewport>,
    images: {} as Record<ImageId, MultiscaleSpatialImage>,
  };
};

export type Viewer = ReturnType<typeof createViewer>;

export const addViewport = (viewer: Viewer, viewport: Viewport) => {
  const id = createId();
  viewer.viewports[id] = viewport;
};
