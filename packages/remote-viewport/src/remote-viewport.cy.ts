import { createRemoteViewport, createTestActors } from './remote-viewport.js';

describe('remote-viewport', () => {
  it('remote actor saves server address', () => {
    const { remote } = createRemoteViewport(createTestActors());

    const address = 'foo';
    remote.send({ type: 'setAddress', address });

    cy.wrap(remote.getSnapshot().context.address).should('equal', address);
  });
});
