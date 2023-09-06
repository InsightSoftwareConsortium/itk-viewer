declare module 'orbit-camera' {
  import { ReadonlyMat4, mat4, ReadonlyVec2, ReadonlyVec3 } from 'gl-matrix';

  export type OrbitCamera = {
    view: (outMat?: mat4) => ReadonlyMat4;
    rotate: (da: ReadonlyVec2, db: ReadonlyVec2) => void;
    pan: (dpan: ReadonlyVec2 | ReadonlyVec3) => void;
    zoom: (delta: number) => void;
    distance: number;
  };

  export default function createOrbitCamera(
    eye: number[],
    target: number[],
    up: number[],
  ): OrbitCamera;
}
