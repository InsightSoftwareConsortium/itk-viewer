import { createViewport } from './remote-viewport.js';

describe('remote-viewport', () => {
  it('creates', () => {
    cy.mount("<div id='viewport'></div>");

    cy.get('#viewport')
      .then((parent) => {
        createViewport({
          parent: parent[0],
          address: 'http://localhost:3000',
        });
        return parent;
      })
      .contains('Remote viewport at http://localhost:3000');
  });
});
