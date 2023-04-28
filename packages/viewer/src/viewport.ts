import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage';

export class Viewport {
  constructor() {
    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr',
      document.location.origin
    );
    ZarrMultiscaleSpatialImage.fromUrl(storeURL);
  }
}
