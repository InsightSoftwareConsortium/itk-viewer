import { ReadonlyMat4, mat4 } from 'gl-matrix';
import { ActorRef, assign, createMachine } from 'xstate';

import { Viewport } from '@itk-viewer/viewer/viewport.js';

type RendererProps = {
  density: number;
  cameraPose: ReadonlyMat4;
};

// https://stackoverflow.com/a/74823834
type Entries<T> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T][];

const getEntries = <T extends object>(obj: T) =>
  Object.entries(obj) as Entries<T>;

type RendererEntries = Entries<RendererProps>; // [['density', 30], ['cameraPose', mat4.create()]]

type Context = {
  address: string | undefined;
  server: any | undefined;
  frame: string | undefined;
  rendererProps: RendererProps;
  queuedRendererProps: RendererEntries;
  stagedRendererProps: RendererEntries;
  viewport: Viewport;
};

type SetAddressEvent = {
  type: 'setAddress';
  address: string | undefined;
};

type UpdateRendererEvent = {
  type: 'updateRenderer';
  props: Partial<RendererProps>;
};

type RenderEvent = {
  type: 'render';
};

export const remoteMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetAddressEvent | UpdateRendererEvent | RenderEvent;
  },
  id: 'remote',
  initial: 'disconnected',
  context: ({ input }: { input: { viewport: Viewport } }) => ({
    address: undefined,
    server: undefined,
    frame: undefined,
    rendererProps: { density: 30, cameraPose: mat4.create() },
    queuedRendererProps: [],
    stagedRendererProps: [],
    ...input, // captures injected viewport
  }),
  states: {
    disconnected: {
      entry: ({ context, self }) => {
        // Update camera pose on viewport change
        context.viewport.subscribe(() => {
          const cameraPose = context.viewport
            .getSnapshot()
            .context.camera?.getSnapshot().context.pose;
          if (!cameraPose) throw new Error('no camera pose');
          self.send({
            type: 'updateRenderer',
            props: { cameraPose },
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
            // initially, send all props to renderer
            queuedRendererProps: ({ context }) =>
              getEntries(context.rendererProps),
          }),
          target: 'rendering',
        },
      },
    },
    rendering: {
      on: {
        updateRenderer: {
          actions: [
            assign({
              rendererProps: ({ event: { props }, context }) => ({
                ...context.rendererProps,
                ...props,
              }),
              queuedRendererProps: ({ event: { props }, context }) => [
                ...context.queuedRendererProps,
                ...(getEntries(props) as RendererEntries),
              ],
            }),
            // Trigger a render (if in idle state)
            ({ self }) => {
              (self as ActorRef<UpdateRendererEvent | RenderEvent>).send({
                type: 'render',
              });
            },
          ],
        },
      },
      initial: 'preRender',
      states: {
        // consumes queue in prep for renderer (as "entry" action happens before "invoke:input")
        preRender: {
          entry: assign({
            stagedRendererProps: ({ context }) => [
              ...context.queuedRendererProps,
            ],
            queuedRendererProps: [],
          }),
          always: {
            target: 'render',
          },
        },
        render: {
          invoke: {
            id: 'render',
            src: 'renderer',
            input: ({ context }: { context: Context }) => ({
              server: context.server,
              props: [...context.stagedRendererProps],
            }),
            onDone: {
              actions: assign({
                frame: ({ event }) => event.output,
              }),
              target: 'idle',
            },
          },
        },
        idle: {
          always: {
            // Renderer props changed while rendering? Then render.
            guard: ({ context }) =>
              Object.keys(context.queuedRendererProps).length > 0,
            target: 'preRender',
          },
          on: {
            render: { target: 'preRender' },
          },
        },
      },
    },
  },
});
