import { assign, createMachine } from 'xstate';

type Context = {
  address: string | undefined;
  server: any | undefined;
  frame: any | undefined;
  density: number;
};

type SetAddressEvent = {
  type: 'setAddress';
  address: string | undefined;
};

type SetDensityEvent = {
  type: 'setDensity';
  density: number;
};

type RenderEvent = {
  type: 'render';
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetAddressEvent | SetDensityEvent | RenderEvent;
  },
  id: 'remote',
  initial: 'disconnected',
  context: {
    address: undefined,
    server: undefined,
    frame: undefined,
    density: 30,
  },
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
            setDensity: {
              actions: [
                assign({
                  density: ({ event }) => event.density,
                }),
              ],
              target: 'updating',
            },
          },
        },
        updating: {
          invoke: {
            id: 'updating',
            src: 'updater',
            input: ({ context }: { context: Context }) => ({
              renderer: context.server,
              density: context.density,
            }),
            onDone: {
              target: 'render',
            },
          },
        },
      },
    },
  },
});
