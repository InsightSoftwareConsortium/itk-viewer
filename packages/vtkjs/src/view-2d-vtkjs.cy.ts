import { createActor, createMachine } from 'xstate';
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

  it('takes imageBuilt event', () => {
    const parent = createActor(createMachine({})).start();
    const render = createActor(createLogic(), { input: { parent } }).start();
    cy.mount('<div id="view-2d-vtkjs-container"></div>');
    cy.get('#view-2d-vtkjs-container')
      .then((button) => {
        render.send({ type: 'setContainer', container: button[0] });
      })
      .then(() => {
        return ZarrMultiscaleSpatialImage.fromUrl(
          new URL('/astronaut.zarr', document.location.origin),
        );
      })
      .then((multiscale) => {
        return multiscale.getImage(2);
      })
      .then((image) => {
        render.send({ type: 'imageBuilt', image });
      });
  });
});
