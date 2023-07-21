import { mount } from 'cypress-lit';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;

      // infer cy.wrap return type: https://github.com/cypress-io/cypress/issues/18182
      wrap<E extends Node = HTMLElement>(
        element: E | JQuery<E>,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<JQuery<E>>;
      wrap<S>(
        object: S | Promise<S>,
        options?: Partial<Loggable & Timeoutable>
      ): Chainable<S>;
    }
  }
}

// workaround for error importing imjoy-rpc in remote-viewport.cy.ts
// Error is in msgpack: Cannot read properties of undefined (reading 'TEXT_ENCODING')
// @ts-ignore
process = undefined;
