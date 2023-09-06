import { ReadonlyMat4, mat4 } from 'gl-matrix';
import { assign, createActor, createMachine } from 'xstate';

type context = {
  pose: ReadonlyMat4;
};

type SetPoseEvent = {
  type: 'setPose';
  pose: ReadonlyMat4;
};

const cameraMachine = createMachine({
  types: {} as {
    context: context;
    events: SetPoseEvent;
  },
  id: 'camera',
  initial: 'active',
  context: { pose: mat4.create() },
  states: {
    active: {
      on: {
        setPose: {
          actions: [
            assign({
              pose: ({ event: { pose } }: { event: SetPoseEvent }) => pose,
            }),
          ],
        },
      },
    },
  },
});

export const createCamera = () => {
  return createActor(cameraMachine).start();
};

export type Camera = ReturnType<typeof createCamera>;
