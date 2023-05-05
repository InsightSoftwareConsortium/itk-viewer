import { createViewport } from './viewport.js';
import { createViewer } from './viewer.js';

describe('Viewer', () => {
  it('constructs', () => {
    expect(createViewer()).to.be.ok;
  });

  it('accepts a viewport', () => {
    const viewer = createViewer();
    const viewport = createViewport();

    viewer.send({ type: 'addViewport', name: 'first', viewport });

    // should have property 'first' with value viewport
    cy.wrap(viewer.getSnapshot().context.viewports).should(
      'have.property',
      'first',
      viewport
    );
  });
});
