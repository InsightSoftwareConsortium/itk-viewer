import { html } from 'lit';

import './itk-viewer-element.js';
import './image-info-viewport.js';

describe('ImageInfoViewport', () => {
  it('mounts', () => {
    cy.mount<'itk-viewer'>(html`<itk-viewer>
      <image-info-viewport></image-info-viewport>
    </itk-viewer>`);

    cy.get('itk-viewer').shadow().contains('Viewer');
  });

  it('has image info', () => {
    cy.mount<'itk-viewer'>(html`<itk-viewer>
      <image-info-viewport></image-info-viewport>
    </itk-viewer>`);

    cy.get('image-info-viewport')
      .shadow()
      .contains('Image Type')
      .contains('Spatial Dimensions')
      .contains('Direction');
  });
});
