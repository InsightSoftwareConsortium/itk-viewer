import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { createViewport, setImage } from './viewport.js';

describe('Viewport', () => {
  it('constructs', () => {
    expect(createViewport()).to.be.ok;
  });

  it('accepts an image', async () => {
    const viewport = createViewport();

    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin
    );
    const image = await ZarrMultiscaleSpatialImage.fromUrl(storeURL);

    setImage(viewport, image);

    expect(viewport.image).to.be.ok;
  });
});
