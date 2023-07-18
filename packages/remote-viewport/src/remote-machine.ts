import { assign, createMachine } from 'xstate';

type Context = {
  address: string | undefined;
};

type SetAddressEvent = {
  type: 'setAddress';
  address: string | undefined;
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetAddressEvent;
  },
  id: 'remote',
  initial: 'active',
  context: { address: undefined },
  states: {
    active: {
      on: {
        setAddress: {
          actions: [
            assign({
              address: ({ event: { address } }: { event: SetAddressEvent }) =>
                address,
            }),
          ],
        },
      },
    },
  },
});
