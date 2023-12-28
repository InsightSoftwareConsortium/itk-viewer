import { ReadonlyMat4, vec3 } from 'gl-matrix';
import type { Bounds, ReadonlyBounds, Vector3 } from './types.js';

// from vtk.js/Sources/Common/DataModel/BoundingBox
// Computes the two corners with minimal and maximal coordinates
function computeCornerPoints(
  bounds: ReadonlyBounds,
  point1: Vector3,
  point2: Vector3,
) {
  point1[0] = bounds[0];
  point1[1] = bounds[2];
  point1[2] = bounds[4];

  point2[0] = bounds[1];
  point2[1] = bounds[3];
  point2[2] = bounds[5];
  return point1;
}

// from vtk.js/Sources/Common/Core/Math
/**
 * Compute the bounds from points.
 * @param {Vector3} point1 The coordinate of the first point.
 * @param {Vector3} point2 The coordinate of the second point.
 * @param {Bounds} bounds Output array that hold bounds, optionally empty.
 */
function computeBoundsFromPoints(
  point1: Array<number>,
  point2: vec3,
  bounds: Bounds,
): Bounds {
  bounds[0] = Math.min(point1[0], point2[0]);
  bounds[1] = Math.max(point1[0], point2[0]);
  bounds[2] = Math.min(point1[1], point2[1]);
  bounds[3] = Math.max(point1[1], point2[1]);
  bounds[4] = Math.min(point1[2], point2[2]);
  bounds[5] = Math.max(point1[2], point2[2]);
  return bounds;
}

export const transformBounds = (
  transformingMat4: ReadonlyMat4,
  bounds: ReadonlyBounds,
) => {
  const in1: Vector3 = Array(3) as Vector3;
  const in2: Vector3 = Array(3) as Vector3;
  computeCornerPoints(bounds, in1, in2);
  const out1: Vector3 = Array(3) as Vector3;
  const out2: Vector3 = Array(3) as Vector3;
  vec3.transformMat4(out1, in1, transformingMat4);
  vec3.transformMat4(out2, in2, transformingMat4);

  return computeBoundsFromPoints(out1, out2, Array(6) as Bounds);
};
