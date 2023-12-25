import { hyphaWebsocketClient } from 'imjoy-rpc';
import { setup } from './viewer.js';
import { createViewer } from '@itk-viewer/viewer/viewer.js';
import { createViewport } from '@itk-viewer/viewer/viewport.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

const serverUrl = 'http://localhost:37580';

describe('imjoy-viewer', () => {
  it('registers service with Hypha server', () => {
    cy.wrap(hyphaWebsocketClient.connectToServer({
      name: 'test-client',
      server_url: serverUrl,
    })).then((server) => {
      const viewer = createViewer();
      cy.wrap(setup(server, viewer)).should('be.ok')
      .and('have.all.keys',
      'addViewport',
      'config',
      'description',
      'id',
      'name',
      'setImage',
      'type',
      'viewer');
    });
  });

  it('returns the viewer', () => {
    const viewer = createViewer();

    cy.wrap(hyphaWebsocketClient.connectToServer({
      name: 'test-client',
      server_url: serverUrl,
    })).then((server) => {
      return cy.wrap(setup(server, viewer))
    })
    .then((service) => {
      cy.wrap(service.viewer()).should('equal', viewer);
    });;
  });

  it('accepts a viewport and set image', () => {
    const viewer = createViewer();
    const viewport = createViewport();
    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin,
    );

    cy.wrap(hyphaWebsocketClient.connectToServer({
      name: 'test-client',
      server_url: serverUrl,
    }))
    .then((server) => {
      cy.wrap(setup(server, viewer));
    }).then((service) => {
      cy.wrap(service.addViewport(viewport, 'first')).then(() => {
        cy.wrap(viewer.getSnapshot().context.viewports)
        .should('have.property', 'first', viewport);
      });
      return service
    }).then((service) => {
      cy.wrap(ZarrMultiscaleSpatialImage.fromUrl(storeURL))
      .then((image) => {
        cy.wrap(service.setImage(image, 'zarr')).then(() => {
          cy.wrap(viewport.getSnapshot().context.image).should('equal', image);
        });
      })
    });
  });
})
