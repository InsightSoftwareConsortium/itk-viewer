import { ReadonlyMat4, ReadonlyVec3, mat4 } from 'gl-matrix';
import { ActorRefFrom, AnyActorRef, assign, createActor, setup } from 'xstate';

export type LookAtParams = {
  eye: ReadonlyVec3;
  center: ReadonlyVec3;
  up: ReadonlyVec3;
};

type Context = {
  pose: ReadonlyMat4;
  lookAt: LookAtParams;
  verticalFieldOfView: number;
  poseWatchers: Array<AnyActorRef>;
};

type SetPoseEvent = {
  type: 'setPose';
  pose: ReadonlyMat4;
};

type LookAtEvent = {
  type: 'lookAt';
  lookAt: LookAtParams;
};

export const cameraMachine = setup({
  types: {} as {
    context: Context;
    events:
      | { type: 'watchPose'; watcher: AnyActorRef }
      | { type: 'watchPoseStop'; watcher: AnyActorRef }
      | SetPoseEvent
      | LookAtEvent;
  },
  actions: {
    emitNewPose: (
      { context: { poseWatchers } },
      params: { pose: ReadonlyMat4 },
    ) => {
      Object.values(poseWatchers).forEach((actor) => {
        actor.send({ type: 'setCameraPose', pose: params.pose });
      });
    },
  },
}).createMachine({
  id: 'camera',
  initial: 'active',
  context: {
    pose: mat4.create(),
    lookAt: { eye: [0, 0, 0], center: [0, 0, 1], up: [0, 1, 0] },
    verticalFieldOfView: 50,
    poseWatchers: [],
  },
  states: {
    active: {
      on: {
        setPose: {
          actions: [
            assign({
              pose: ({ event: { pose } }: { event: SetPoseEvent }) => pose,
            }),
            {
              type: 'emitNewPose',
              params: ({ context: { pose } }) => ({ pose }),
            },
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
            {
              type: 'emitNewPose',
              params: ({ context: { pose } }) => ({ pose }),
            },
          ],
        },
        watchPose: {
          actions: [
            assign({
              poseWatchers: ({
                context: { poseWatchers },
                event: { watcher },
              }) => {
                return [...poseWatchers, watcher];
              },
            }),
            ({ context: { pose }, event: { watcher } }) => {
              watcher.send({ type: 'setCameraPose', pose });
            },
          ],
        },
        watchPoseStop: {
          actions: [
            assign({
              poseWatchers: ({
                context: { poseWatchers },
                event: { watcher },
              }) => {
                return poseWatchers.filter((w) => w !== watcher);
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

export type Camera = ActorRefFrom<typeof cameraMachine>;
