import { Bounds } from '@itk-viewer/io/types.js';
import { ReadonlyVec3, mat4, vec3, quat, ReadonlyQuat } from 'gl-matrix';
import { ActorRefFrom, AnyActorRef, assign, createActor, setup } from 'xstate';

export type Pose = {
  center: vec3;
  rotation: quat;
  distance: number;
};

export type ReadonlyPose = {
  readonly center: ReadonlyVec3;
  readonly rotation: ReadonlyQuat;
  readonly distance: number;
};

const createPose = () => ({
  center: vec3.create(),
  rotation: quat.create(),
  distance: 1,
});

const copyPose = (out: Pose, source: ReadonlyPose) => {
  return {
    center: vec3.copy(out.center, source.center),
    rotation: quat.copy(out.rotation, source.rotation),
    distance: source.distance,
  };
};

export const toMat4 = (() => {
  const scratch0 = new Float32Array(16);
  const scratch1 = new Float32Array(16);
  const matTemp = mat4.create();
  return (out: mat4, pose: ReadonlyPose) => {
    scratch1[0] = scratch1[1] = 0.0;
    scratch1[2] = -pose.distance;
    mat4.fromRotationTranslation(
      matTemp,
      quat.conjugate(scratch0, pose.rotation),
      scratch1,
    );
    mat4.translate(out, matTemp, vec3.negate(scratch0, pose.center));
    return out;
  };
})();

type Context = {
  pose: Pose;
  verticalFieldOfView: number;
  poseWatchers: Array<AnyActorRef>;
};

type SetPoseEvent = {
  type: 'setPose';
  pose: ReadonlyPose;
};

export const cameraMachine = setup({
  types: {} as {
    context: Context;
    events:
      | { type: 'watchPose'; watcher: AnyActorRef }
      | { type: 'watchPoseStop'; watcher: AnyActorRef }
      | SetPoseEvent;
  },
  actions: {
    emitNewPose: ({ context: { poseWatchers } }, params: { pose: Pose }) => {
      Object.values(poseWatchers).forEach((actor) => {
        actor.send({ type: 'setCameraPose', pose: params.pose });
      });
    },
  },
}).createMachine({
  id: 'camera',
  initial: 'active',
  context: {
    pose: createPose(),
    verticalFieldOfView: 50,
    poseWatchers: [],
  },
  states: {
    active: {
      on: {
        setPose: {
          actions: [
            assign({
              pose: ({ event: { pose }, context }) => {
                return copyPose(context.pose, pose);
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
  pose: Pose,
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

  return { center, rotation: pose.rotation, distance };
};
