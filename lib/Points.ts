import { Point } from './Point'
export class Points {
  private _points: Point[] = []
  eventTarget = new EventTarget()

  get points() {
    return [...this._points]
  }

  // in normalized coordinates
  addPoint(x: number, y: number) {
    const pointToAdd = new Point(x, y)
    pointToAdd.eventTarget.addEventListener('updated', () =>
      this.dispatchUpdatedEvent()
    )
    this._points = [...this._points, pointToAdd]
    this.dispatchUpdatedEvent()
    return pointToAdd
  }

  removePoint(point: Point) {
    this._points = this._points.filter((p) => p !== point)
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: this._points })
    )
  }
}
