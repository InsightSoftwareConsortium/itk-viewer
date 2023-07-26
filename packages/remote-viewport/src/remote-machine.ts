import { ReadonlyMat4, mat4 } from 'gl-matrix';
import { ActorRef, assign, createMachine } from 'xstate';

import { Viewport } from '@itk-viewer/viewer/viewport.js';

type RendererProps = {
  density: number;
  cameraPose: ReadonlyMat4;
};

type RendererPatch = Partial<RendererProps>;

type Context = {
  address: string | undefined;
  server: any | undefined;
  frame: string | undefined;
  rendererProps: RendererProps;
  dirtyRendererProps: RendererPatch;
  stagedRendererProps: RendererPatch;
  viewport: Viewport;
};

type SetAddressEvent = {
  type: 'setAddress';
  address: string | undefined;
};

type UpdateRendererEvent = {
  type: 'updateRenderer';
  props: RendererPatch;
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
    dirtyRendererProps: {},
    stagedRendererProps: {},
    ...input, // captures injected viewport
  }),
  states: {
    disconnected: {
      entry: ({ context, self }) => {
        context.viewport.subscribe(() => {
          const cameraPose = context.viewport
            .getSnapshot()
            .context.camera?.getSnapshot().context.pose;
          if (!cameraPose) throw new Error('no camera pose');
          self.send({
            type: 'updateRenderer',
            props: {
              cameraPose,
            },
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
              dirtyRendererProps: ({ event: { props }, context }) => ({
                ...context.dirtyRendererProps,
                ...props,
              }),
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
      initial: 'render',
      states: {
        // consumes queue in prep for renderer (as "entry" action happens before "invoke:input")
        preRender: {
          entry: assign({
            stagedRendererProps: ({ context }) => ({
              ...context.dirtyRendererProps,
            }),
            dirtyRendererProps: {},
          }),
          always: {
            target: 'render',
          },
        },
        render: {
          invoke: {
            id: 'render',
            src: 'renderer',
            input: ({ context }: { context: Context }) => {
              return {
                server: context.server,
                props: { ...context.stagedRendererProps },
              };
            },
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
              Object.keys(context.dirtyRendererProps).length > 0,
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
