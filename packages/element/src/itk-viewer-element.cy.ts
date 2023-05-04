import { html } from 'lit';

import './itk-viewer-element';

describe('Lit mount', () => {
  it('mounts', () => {
    cy.mount<'itk-viewer'>(html`<itk-viewer image="url"></itk-viewer>`);
    cy.get('itk-viewer').shadow().contains('Viewer');
  });
});
