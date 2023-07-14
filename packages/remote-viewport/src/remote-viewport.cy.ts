import { createRemoteViewport } from './remote-viewport.js';

describe('remote-viewport', () => {
  it('creates', () => {
    cy.mount("<div id='viewport'></div>");

    cy.get('#viewport')
      .then((parent) => {
        const { element } = createRemoteViewport({
          address: 'http://localhost:3000',
        });
        return parent.append(element);
      })
      .contains('Remote viewport at http://localhost:3000');
  });
});
