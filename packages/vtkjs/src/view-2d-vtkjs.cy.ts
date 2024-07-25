import { createActor, createMachine } from 'xstate';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { createLogic } from './view-2d-vtkjs.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { html } from 'lit';

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
    cy.mount(html`<div id="view-2d-vtkjs-container"></div>`);
    cy.get('#view-2d-vtkjs-container')
      .then((containers) => {
        render.send({ type: 'setContainer', container: containers[0] });
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

  it('takes multiple set containers gracefully', () => {
    const parent = createActor(createMachine({})).start();
    const render = createActor(createLogic(), { input: { parent } }).start();
    cy.mount(
      html`<div id="container1"></div>
        <div id="container2"></div>`,
    );
    cy.get('#container1').then((containers) => {
      render.send({ type: 'setContainer', container: containers[0] });
      render.send({ type: 'setContainer', container: undefined });
    });

    cy.get('#container2').then((containers) => {
      render.send({ type: 'setContainer', container: containers[0] });
    });
  });
});
