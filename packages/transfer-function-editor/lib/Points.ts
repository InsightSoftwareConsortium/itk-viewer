import { Point } from './Point';
import { ArrayPoint } from './utils';

// if clampEnds is true, add points at ends with y = 0
// else extend left and right points to 0 and 1 with left/right y value
export const extendPoints = (
  points: (readonly [number, number])[],
  clampEnds = false,
) => {
  if (points.length === 0) {
    return [
      [0, 1],
      [1, 1],
    ];
  }

  if (points.length === 1) {
    const [, y] = points[0];
    return [
      [0, y],
      [1, y],
    ];
  }

  const head = points[0];
  const tail = points[points.length - 1];

  if (clampEnds) return [[head[0], 0], ...points, [tail[0], 0]];

  // Extend head and tail to the left and right if not already outside [0, 1]
  const extendedPoints = [];
  if (head[0] > 0) {
    extendedPoints.push([0, head[1]]);
  }
  extendedPoints.push(...points);
  if (tail[0] < 1) {
    extendedPoints.push([1, tail[1]]);
  }

  return extendedPoints;
};

export const pointsToExtendedPoints = (points: Point[]) =>
  extendPoints(points.map(({ x, y }) => [x, y]));

export class Points {
  eventTarget = new EventTarget();
  private _points: Point[] = [];
  private disableEventDispatch = false;

  get points() {
    return [...this._points];
  }

  // in normalized coordinates
  addPoint(x: number, y: number) {
    const pointToAdd = this.createPoint(x, y);
    this.dispatchUpdatedEvent();
    return pointToAdd;
  }

  // does not call this.dispatchUpdatedEvent() assuming setPoints() holds external point state and will update downstream function
  addPoints(points: ArrayPoint[]) {
    return points.map(([x, y]) => this.createPoint(x, y));
  }

  setPoints(points: ArrayPoint[]) {
    [...this._points].forEach((point) => this.deletePoint(point));
    return this.addPoints(points);
  }

  removePoint(point: Point) {
    this.deletePoint(point);
    this.dispatchUpdatedEvent();
  }

  dispatchUpdatedEvent() {
    if (this.disableEventDispatch) return;
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: this._points }),
    );
  }

  batchUpdatePoints(points: ArrayPoint[]) {
    this.disableEventDispatch = true;
    this._points.forEach((point, i) => {
      point.setPosition(points[i][0], points[i][1]);
    });
    this.disableEventDispatch = false;
    this.dispatchUpdatedEvent();
  }

  private createPoint(x: number, y: number) {
    const pointToAdd = new Point(x, y);
    pointToAdd.eventTarget.addEventListener('updated', () => {
      this._points.sort((a, b) => a.x - b.x);
      this.dispatchUpdatedEvent();
    });
    this._points.push(pointToAdd);
    this._points.sort((a, b) => a.x - b.x);
    return pointToAdd;
  }

  private deletePoint(point: Point) {
    this._points = this._points.filter((p) => p !== point);
  }
}
