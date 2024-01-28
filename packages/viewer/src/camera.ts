import { Bounds } from '@itk-viewer/io/types.js';
import { ReadonlyMat4, ReadonlyVec3, mat4, vec3 } from 'gl-matrix';
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

export const reset3d = (
  currentPose: ReadonlyMat4,
  verticalFieldOfView: number,
  bounds: Bounds,
) => {
  const center = vec3.fromValues(
    (bounds[0] + bounds[1]) / 2.0,
    (bounds[2] + bounds[3]) / 2.0,
    (bounds[4] + bounds[5]) / 2.0,
  );

  let w1 = bounds[1] - bounds[0];
  let w2 = bounds[3] - bounds[2];
  let w3 = bounds[5] - bounds[4];
  w1 *= w1;
  w2 *= w2;
  w3 *= w3;
  let radius = w1 + w2 + w3;
  // If we have just a single point, pick a radius of 1.0
  radius = radius === 0 ? 1.0 : radius;
  // compute the radius of the enclosing sphere
  radius = Math.sqrt(radius) * 0.5;

  const angle = verticalFieldOfView * (Math.PI / 180); // to radians
  const distance = radius / Math.sin(angle * 0.5);

  const forward = [currentPose[8], currentPose[9], currentPose[10]];
  const up = vec3.fromValues(currentPose[4], currentPose[5], currentPose[6]);

  const eye = vec3.fromValues(
    center[0] + distance * forward[0],
    center[1] + distance * forward[1],
    center[2] + distance * forward[2],
  );

  return { eye, center, up };
};
