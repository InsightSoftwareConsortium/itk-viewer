import { createActor, createMachine } from 'xstate';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { view2d } from './view-2d.js';

describe('view 2d', () => {
  it('constructs', () => {
    expect(createActor(view2d)).to.be.ok;
  });

  it('spawns renderer actors', async () => {
    let childStarted = false;
    let childImage: ZarrMultiscaleSpatialImage | object = {};
    const renderer = createMachine({
      entry: [
        () => {
          childStarted = true;
        },
      ],
      on: {
        setImage: {
          actions: ({ event }) => {
            childImage = event.image;
          },
        },
      },
    });
    const view = createActor(view2d).start();
    view.send({ type: 'addRenderer', logic: renderer });
    expect(childStarted).to.be.true;

    const image = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    view.send({ type: 'setImage', image });
    expect(childImage).equals(image);
  });
});
