import { fromPromise } from 'xstate';
import {
  RemoteMachineActors,
  createRemoteViewport,
} from './remote-viewport.js';

export const createTestActors: () => RemoteMachineActors = () => ({
  actors: {
    connect: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'aServer';
    }),
    renderer: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { frame: 'new frame here' };
    }),
    updater: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }),
  },
});

describe('remote-viewport', () => {
  it('remote actor saves server address', () => {
    const { remote } = createRemoteViewport(createTestActors());

    const address = 'foo';
    remote.send({ type: 'setAddress', address });

    cy.wrap(remote.getSnapshot().context.address).should('equal', address);
  });
});
