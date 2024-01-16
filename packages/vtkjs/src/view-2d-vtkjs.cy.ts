import { createActor } from 'xstate';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { createLogic } from './view-2d-vtkjs.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

before(() => {
  const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
  setPipelineWorkerUrl(pipelineWorkerUrl);
  const pipelineBaseUrl = '/itk/pipelines';
  setPipelinesBaseUrl(pipelineBaseUrl);
});

describe('View 2D vtk.js', () => {
  it('constructs', () => {
    expect(createLogic()).to.be.ok;
  });

  it('takes imageBuild event', async () => {
    const render = createActor(createLogic()).start();

    const multiscale = await ZarrMultiscaleSpatialImage.fromUrl(
      new URL('/astronaut.zarr', document.location.origin),
    );
    const image = await multiscale.getImage(2);
    render.send({ type: 'imageBuilt', image });
  });
});
