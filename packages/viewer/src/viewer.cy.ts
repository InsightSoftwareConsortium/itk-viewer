import { createViewport } from './viewport.js';
import { createViewer } from './viewer.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

describe('Viewer', () => {
  it('constructs', () => {
    expect(createViewer()).to.be.ok;
  });

  it('accepts a viewport', () => {
    const viewer = createViewer();
    const viewport = createViewport();

    viewer.send({ type: 'addViewport', name: 'first', viewport });

    // should have property 'first' with value viewport
    cy.wrap(viewer.getSnapshot().context.viewports).should(
      'have.property',
      'first',
      viewport
    );
  });

  it('adding a image triggers update in added viewports', async () => {
    const viewer = createViewer();
    const viewport = createViewport();

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const watcher = { viewportUpdated: () => {} };
    cy.spy(watcher, 'viewportUpdated');
    const sub = viewport.subscribe(watcher.viewportUpdated);

    viewer.send({ type: 'addViewport', name: 'first', viewport });

    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin
    );
    const image = await ZarrMultiscaleSpatialImage.fromUrl(storeURL);
    viewer.send({ type: 'addImage', name: 'zarr', image });

    expect(watcher.viewportUpdated).to.be.called;

    cy.wrap(() => sub.unsubscribe());
  });
});
