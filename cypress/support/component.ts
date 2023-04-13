import 'cypress-watch-and-reload/support';
import { mount } from './lit';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}
