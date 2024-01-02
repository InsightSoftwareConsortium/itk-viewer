import { html } from 'lit';

import './itk-viewer-element.js';
import './itk-image-info-viewport.js';

describe('ImageInfoViewport', () => {
  it('mounts', () => {
    cy.mount<'itk-viewer'>(html`
      <itk-viewer>
        <itk-image-info-viewport></itk-image-info-viewport>
      </itk-viewer>
    `);

    cy.get('itk-viewer').shadow().contains('Viewer');
  });

  it('has image info', () => {
    cy.mount<'itk-viewer'>(html`
      <itk-viewer>
        <image-info-viewport></image-info-viewport>
      </itk-viewer>
    `);

    // cy.get('image-info-viewport')
    //   .shadow()
    //   .contains('Image Type')
    //   .contains('Spatial Dimensions')
    //   .contains('Direction');
  });

  it('updates image info when image changes', () => {
    cy.mount<'itk-viewer'>(html`
      <itk-viewer>
        <itk-image-info-viewport></itk-image-info-viewport>
      </itk-viewer>
    `);

    // cy.get('image-info-viewport')
    //   .shadow()
    //   .contains('Image Type')
    //   .contains('Spatial Dimensions')
    //   .contains('Direction');
  });
});
