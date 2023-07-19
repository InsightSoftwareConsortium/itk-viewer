import { assign, createMachine } from 'xstate';

type Context = {
  address: string | undefined;
  server: any | undefined;
  frame: any | undefined;
};

type SetAddressEvent = {
  type: 'setAddress';
  address: string | undefined;
};

type RenderEvent = {
  type: 'render';
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetAddressEvent | RenderEvent;
  },
  id: 'remote',
  initial: 'disconnected',
  context: { address: undefined, server: undefined, frame: undefined },
  states: {
    disconnected: {
      on: {
        setAddress: {
          actions: [
            assign({
              address: ({ event: { address } }: { event: SetAddressEvent }) => {
                return address;
              },
            }),
          ],
          target: 'connecting',
        },
      },
    },
    connecting: {
      invoke: {
        id: 'connect',
        src: 'connect',
        input: ({ context }: { context: Context }) => ({
          address: context.address,
        }),
        onDone: {
          actions: assign({
            server: ({ event }) => event.output,
          }),
          target: 'connected',
        },
      },
    },
    connected: {
      initial: 'render',
      states: {
        render: {
          invoke: {
            id: 'render',
            src: 'renderer',
            input: ({ context }: { context: Context }) => context.server,
            onDone: {
              actions: assign({
                frame: ({ event }) => event.output,
              }),
              target: 'idle',
            },
          },
        },
        idle: {
          on: {
            render: { target: 'render' },
          },
        },
      },
    },
  },
});
