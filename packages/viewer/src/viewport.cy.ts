import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { createViewport, setImage } from './viewport.js';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

describe('Viewport', () => {
  it('constructs', () => {
    expect(createViewport()).to.be.ok;
  });

  it('accepts a image', async () => {
    const viewport = createViewport();

    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin
    );
    const image = await ZarrMultiscaleSpatialImage.fromUrl(storeURL);

    setImage(viewport, image as unknown as MultiscaleSpatialImage);

    expect(viewport.image).to.be.ok;
  });
});
