import { ReadonlyMat4, ReadonlyVec3, mat4 } from 'gl-matrix';
import { assign, createActor, createMachine } from 'xstate';

export type LookAtParams = {
  eye: ReadonlyVec3;
  target: ReadonlyVec3;
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
    lookAt: { eye: [0, 0, 0], target: [0, 0, 1], up: [0, 1, 0] },
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
                const { eye, target, up } = lookAt;
                const pose = mat4.create();
                mat4.lookAt(pose, eye, target, up);
                return pose;
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
