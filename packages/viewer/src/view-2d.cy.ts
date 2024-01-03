import { createActor, createMachine } from 'xstate';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { view2d } from './view-2d.js';

describe('view 2d', () => {
  it('constructs', () => {
    expect(createActor(view2d).start()).to.be.ok;
  });

  it('spawns renderer actors and forwards them setImage', async () => {
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
    view.send({ type: 'createRenderer', logic: renderer });
    expect(childStarted).to.be.true;

    const image = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    view.send({ type: 'setImage', image });
    expect(childImage).equals(image);
  });
});
