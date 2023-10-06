declare module 'orbit-camera' {
  import { mat4, ReadonlyVec2, ReadonlyVec3 } from 'gl-matrix';

  export type OrbitCamera = {
    view: <M extends mat4>(outMat?: M) => M;
    rotate: (da: ReadonlyVec2, db: ReadonlyVec2) => void;
    pan: (dpan: ReadonlyVec2 | ReadonlyVec3) => void;
    zoom: (delta: number) => void;
    lookAt: (eye: ReadonlyVec3, center: ReadonlyVec3, up: ReadonlyVec3) => void;
    distance: number;
  };

  export default function createOrbitCamera(
    eye: number[],
    center: number[],
    up: number[],
  ): OrbitCamera;
}
