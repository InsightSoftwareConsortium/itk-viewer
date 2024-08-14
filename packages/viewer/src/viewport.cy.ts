import { createActor, createMachine } from 'xstate';
import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { createCamera } from './camera.js';
import { viewportMachine } from './viewport.js';

const noop = () => {};
const createViewport = () =>
  createActor(
    viewportMachine.provide({
      actions: {
        // if not spawned in system, don't error trying to send to parent
        forwardToParent: noop,
      },
    }),
  ).start();

describe('Viewport', () => {
  it('constructs', () => {
    createViewport();
  });

  it('accepts an image', async () => {
    const viewport = createViewport();

    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin,
    );
    const image = await ZarrMultiscaleSpatialImage.fromUrl(storeURL);

    viewport.send({ type: 'setImage', image });

    cy.wrap(viewport.getSnapshot().context.image).should('equal', image);
  });

  it('adopts a camera actor', () => {
    const viewport = createViewport();
    const camera = createCamera();
    viewport.send({ type: 'setCamera', camera });

    cy.wrap(
      viewport.getSnapshot().context.camera?.getSnapshot().context.pose,
    ).should('deep.equal', camera.getSnapshot().context.pose);
  });

  it('spawns view actors', async () => {
    let childStarted = false;
    let childImage: MultiscaleSpatialImage | object = {};
    const view = createMachine({
      entry: () => {
        childStarted = true;
      },
      on: {
        setImage: {
          actions: ({ event }) => {
            childImage = event.image;
          },
        },
      },
    });
    const viewport = createViewport();
    viewport.send({
      type: 'createChild',
      childType: 'viewport',
      logic: view,
      onActor: () => {},
    });
    expect(childStarted).to.be.true;

    const image = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    viewport.send({ type: 'setImage', image });
    expect(childImage).equals(image);
  });
});
