// Augment the Cypress namespace to include type definitions for
// your custom mount command.

import { mount } from "./lit";

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}
