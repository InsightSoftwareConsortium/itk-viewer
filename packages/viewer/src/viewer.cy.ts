import { createViewport } from './viewport.js';
import { addViewport, createViewer } from './viewer.js';

describe('Viewer', () => {
  it('constructs', () => {
    expect(createViewer()).to.be.ok;
  });

  it('accepts a viewport', () => {
    const viewer = createViewer();
    const viewport = createViewport();
    addViewport(viewer, viewport);

    cy.wrap(Object.values(viewer.viewports))
      .should('have.length', 1)
      .should('include', viewport);
  });
});
