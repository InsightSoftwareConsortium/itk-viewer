import { Point } from './Point'

// add points at ends with y 0
export const windowPoints = (points: [number, number][]) => {
  if (points.length === 0) {
    return [
      [0, 1],
      [1, 1],
    ]
  }

  if (points.length === 1) {
    const [, y] = points[0]
    return [
      [0, y],
      [1, y],
    ]
  }

  const head = points[0]
  const tail = points[points.length - 1]
  return [[head[0], 0], ...points, [tail[0], 0]]
}

export const pointsToWindowedPoints = (points: Point[]) =>
  windowPoints(points.map(({ x, y }) => [x, y]))

export class Points {
  private _points: Point[] = []
  eventTarget = new EventTarget()

  get points() {
    return [...this._points]
  }

  // in normalized coordinates
  addPoint(x: number, y: number) {
    const pointToAdd = this.createPoint(x, y)
    this.dispatchUpdatedEvent()
    return pointToAdd
  }

  // does not call this.dispatchUpdatedEvent() assuming setPoints() holds external point state and will update downstream function
  addPoints(points: [number, number][]) {
    const pointsMade = points.map(([x, y]) => this.createPoint(x, y))
    return pointsMade
  }

  setPoints(points: [number, number][]) {
    ;[...this._points].forEach((point) => this.deletePoint(point))
    return this.addPoints(points)
  }

  removePoint(point: Point) {
    this.deletePoint(point)
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: this._points }),
    )
  }

  private createPoint(x: number, y: number) {
    const pointToAdd = new Point(x, y)
    pointToAdd.eventTarget.addEventListener('updated', () => {
      this._points.sort((a, b) => a.x - b.x)
      this.dispatchUpdatedEvent()
    })
    this._points.push(pointToAdd)
    this._points.sort((a, b) => a.x - b.x)
    return pointToAdd
  }

  private deletePoint(point: Point) {
    this._points = this._points.filter((p) => p !== point)
  }
}
