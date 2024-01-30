export type Bounds = [number, number, number, number, number, number];

export type ReadonlyBounds = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

const INIT_BOUNDS = Object.freeze([
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // X
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // Y
  Number.MAX_VALUE,
  -Number.MAX_VALUE, // Z
] as ReadonlyBounds);

export const createBounds = () => [...INIT_BOUNDS] as Bounds;

export function addPoint(bounds: Bounds, x: number, y: number, z: number) {
  const [xMin, xMax, yMin, yMax, zMin, zMax] = bounds;
  bounds[0] = xMin < x ? xMin : x;
  bounds[1] = xMax > x ? xMax : x;
  bounds[2] = yMin < y ? yMin : y;
  bounds[3] = yMax > y ? yMax : y;
  bounds[4] = zMin < z ? zMin : z;
  bounds[5] = zMax > z ? zMax : z;
  return bounds;
}

export function getCorners(bounds: ReadonlyBounds) {
  const corners = new Array<[number, number, number]>(8);
  let count = 0;
  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 2; iy < 4; iy++) {
      for (let iz = 4; iz < 6; iz++) {
        corners[count++] = [bounds[ix], bounds[iy], bounds[iz]];
      }
    }
  }
  return corners;
}

export function getLength(bounds: ReadonlyBounds, index: number) {
  return bounds[index * 2 + 1] - bounds[index * 2];
}
