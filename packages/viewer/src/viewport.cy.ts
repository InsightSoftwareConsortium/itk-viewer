import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { createViewport } from './viewport.js';

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

    viewport.send({ type: 'setImage', image });

    cy.wrap(viewport.getSnapshot().context.image).should('equal', image);
  });
});
