import { ReadonlyMat4, ReadonlyVec3, mat4 } from 'gl-matrix';
import { assign, createActor, createMachine } from 'xstate';

export type LookAtParams = {
  eye: ReadonlyVec3;
  center: ReadonlyVec3;
  up: ReadonlyVec3;
};

type Context = {
  pose: ReadonlyMat4;
  lookAt: LookAtParams;
  verticalFieldOfView: number;
};

type SetPoseEvent = {
  type: 'setPose';
  pose: ReadonlyMat4;
};

type LookAtEvent = {
  type: 'lookAt';
  lookAt: LookAtParams;
};

const cameraMachine = createMachine({
  types: {} as {
    context: Context;
    events: SetPoseEvent | LookAtEvent;
  },
  id: 'camera',
  initial: 'active',
  context: {
    pose: mat4.create(),
    lookAt: { eye: [0, 0, 0], center: [0, 0, 1], up: [0, 1, 0] },
    verticalFieldOfView: 50,
  },
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
        lookAt: {
          actions: [
            assign({
              lookAt: ({ event: { lookAt } }) => lookAt,
              pose: ({ event: { lookAt } }) => {
                const { eye, center, up } = lookAt;
                return mat4.lookAt(mat4.create(), eye, center, up);
              },
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
