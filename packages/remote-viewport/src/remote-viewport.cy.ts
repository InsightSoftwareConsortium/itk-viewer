import { fromPromise } from 'xstate';
import {
  RemoteMachineActors,
  createRemoteViewport,
} from './remote-viewport.js';

export const createTestActors: () => RemoteMachineActors = () => ({
  actors: {
    connect: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'aServer' as unknown;
    }),
    renderer: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        frame: { size: [1, 1], data: new ArrayBuffer(1) },
        renderTime: 0,
      };
    }),
  },
});

describe('remote-viewport', () => {
  it('remote actor saves server config', () => {
    const { remote } = createRemoteViewport(createTestActors());

    const config = 'foo';
    remote.send({ type: 'connect', config });

    cy.wrap(remote.getSnapshot().context.serverConfig).should('equal', config);
  });
});
