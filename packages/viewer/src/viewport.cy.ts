import { mat4 } from 'gl-matrix';
import { createActor, createMachine } from 'xstate';
import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { createCamera } from './camera-machine.js';
import { viewportMachine } from './viewport-machine.js';

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
    expect(createViewport()).to.be.ok;
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

  it('updates observers when camera updates', () => {
    const viewport = createViewport();

    const camera = createCamera();

    viewport.send({ type: 'setCamera', camera });

    cy.wrap(
      viewport.getSnapshot().context.camera?.getSnapshot().context.pose,
    ).should('deep.equal', camera.getSnapshot().context.pose);

    let cameraPose = undefined;
    viewport.subscribe((state) => {
      cameraPose = state.context.camera?.getSnapshot().context.pose;
    });

    const targetCameraPose = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
    camera.send({
      type: 'setPose',
      pose: targetCameraPose,
    });

    cy.wrap(cameraPose).should('deep.equal', targetCameraPose);
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
    viewport.send({ type: 'createView', logic: view });
    expect(childStarted).to.be.true;

    const image = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    viewport.send({ type: 'setImage', image });
    expect(childImage).equals(image);
  });
});
