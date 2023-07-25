import { Viewport } from '@itk-viewer/viewer/viewport.js';
import { ActorRef, assign, createMachine } from 'xstate';

type Context = {
  address: string | undefined;
  server: any | undefined;
  frame: string | undefined;
  density: number;
  viewport: Viewport;
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

type CameraPoseUpdatedEvent = {
  type: 'cameraPoseUpdated';
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events:
      | SetAddressEvent
      | SetDensityEvent
      | RenderEvent
      | CameraPoseUpdatedEvent;
  },
  id: 'remote',
  initial: 'disconnected',
  context: ({ input }: { input: { viewport: Viewport } }) => ({
    address: undefined,
    server: undefined,
    frame: undefined,
    density: 30,
    ...input, // captures injected viewport
  }),
  states: {
    disconnected: {
      entry: ({ context, self }) => {
        console.log(context);
        context.viewport.subscribe(() => {
          (self as ActorRef<CameraPoseUpdatedEvent>).send({
            type: 'cameraPoseUpdated',
          });
        });
      },
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
            cameraPoseUpdated: {
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
              camera: context.viewport
                ?.getSnapshot()
                .context.camera?.getSnapshot().context,
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
