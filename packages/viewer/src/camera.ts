import {
  Bounds,
  addPoint,
  createBounds,
  getCorners,
  getLength,
} from '@itk-viewer/utils/bounding-box.js';
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
  const scratch0 = new Float32Array(4);
  const scratch1 = new Float32Array(3);
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
  enableRotation: boolean;
  verticalFieldOfView: number;
  parallelScaleRatio: number; // distance to parallelScale
  poseWatchers: Array<AnyActorRef>;
};

type SetPoseEvent = {
  type: 'setPose';
  pose: ReadonlyPose & { parallelScale?: number };
};

export const cameraMachine = setup({
  types: {} as {
    context: Context;
    events:
      | { type: 'watchPose'; watcher: AnyActorRef }
      | { type: 'watchPoseStop'; watcher: AnyActorRef }
      | { type: 'setEnableRotation'; enable: boolean }
      | SetPoseEvent;
  },
  actions: {
    emitNewPose: (
      { context: { poseWatchers } },
      params: { pose: Pose; parallelScaleRatio: number },
    ) => {
      Object.values(poseWatchers).forEach((actor) => {
        actor.send({
          type: 'setCameraPose',
          pose: params.pose,
          parallelScaleRatio: params.parallelScaleRatio,
        });
      });
    },
  },
}).createMachine({
  id: 'camera',
  initial: 'active',
  context: () => ({
    pose: createPose(),
    enableRotation: true,
    parallelScaleRatio: 1,
    verticalFieldOfView: 50,
    poseWatchers: [],
  }),
  states: {
    active: {
      on: {
        setPose: {
          actions: [
            assign({
              pose: ({ event: { pose }, context }) => {
                const clampedPose = {
                  ...pose,
                  rotation: context.enableRotation
                    ? pose.rotation
                    : context.pose.rotation,
                };
                return copyPose(context.pose, clampedPose);
              },
              parallelScaleRatio: ({ event: { pose }, context }) => {
                const { distance, parallelScale = undefined } = pose;
                // parallelScale updated during reset, not during normal camera movement
                if (parallelScale === undefined)
                  return context.parallelScaleRatio;
                return parallelScale / distance;
              },
            }),
            {
              type: 'emitNewPose',
              params: ({ context: { pose, parallelScaleRatio } }) => ({
                pose,
                parallelScaleRatio,
              }),
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
            ({ context: { pose, parallelScaleRatio }, event: { watcher } }) => {
              watcher.send({ type: 'setCameraPose', pose, parallelScaleRatio });
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
        setEnableRotation: {
          actions: assign({
            enableRotation: ({ event }) => event.enable,
          }),
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

  const radians = verticalFieldOfView * (Math.PI / 180);
  const distance = radius / Math.sin(radians * 0.5);

  return { center, rotation: pose.rotation, distance };
};

export const reset2d = (
  pose: Pose,
  verticalFieldOfView: number,
  bounds: Bounds,
  aspect: number,
) => {
  const center = vec3.fromValues(
    (bounds[0] + bounds[1]) / 2.0,
    (bounds[2] + bounds[3]) / 2.0,
    (bounds[4] + bounds[5]) / 2.0,
  );

  // Get the bounds in view coordinates
  const visiblePoints = getCorners(bounds);

  const viewBounds = createBounds();
  const viewMat = mat4.create();
  toMat4(viewMat, pose);
  for (let i = 0; i < visiblePoints.length; ++i) {
    const point = visiblePoints[i];
    vec3.transformMat4(point, point, viewMat);
    addPoint(viewBounds, ...point);
  }

  const xLength = getLength(viewBounds, 0);
  const yLength = getLength(viewBounds, 1);
  // compute half the width or height of the viewport
  const parallelScale = 0.5 * Math.max(yLength, xLength / aspect);

  const radians = verticalFieldOfView * (Math.PI / 180);
  const distance = parallelScale / Math.tan(radians * 0.5);

  return { center, rotation: pose.rotation, distance, parallelScale };
};
