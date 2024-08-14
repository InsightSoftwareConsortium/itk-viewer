import { createActor, createMachine } from 'xstate';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { MultiscaleSpatialImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { viewerMachine } from './viewer.js';

export const createViewer = () => {
  return createActor(viewerMachine).start();
};

describe('Viewer', () => {
  it('constructs', () => {
    expect(createViewer().getSnapshot()).to.be.ok;
  });

  it('spawns viewport actors that get setImage events', async () => {
    let childStarted = false;
    let childImage: MultiscaleSpatialImage | object = {};
    const logic = createMachine({
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
    const viewer = createViewer();
    viewer.send({
      type: 'createChild',
      childType: 'viewport',
      logic,
      onActor: () => {},
    });
    expect(childStarted).to.be.true;

    const image = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    viewer.send({ type: 'setImage', image });
    expect(childImage).equals(image);
  });
});
