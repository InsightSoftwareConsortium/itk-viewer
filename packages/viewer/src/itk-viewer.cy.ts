import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { Viewer } from './itk-viewer.js';
import { createViewport } from './viewport.js';

describe('Viewer', () => {
  it('constructs', () => {
    expect(new Viewer()).to.be.ok;
  });

  it('accepts a viewport', () => {
    const viewer = new Viewer();
    const viewport = createViewport();
    viewer.addViewport(viewport);

    cy.wrap(viewer.viewports)
      .should('have.length', 1)
      .should('include', viewport);
  });
});

describe('Viewport', () => {
  it('constructs', () => {
    expect(createViewport()).to.be.ok;
  });

  it('accepts a image', async () => {
    const viewport = createViewport();

    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr',
      document.location.origin
    );
    const image = await ZarrMultiscaleSpatialImage.fromUrl(storeURL);
    viewport.image = image;
    expect(viewport.image).to.be.ok;
  });
});
