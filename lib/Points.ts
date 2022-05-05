import { Point } from './Point'
export class Points {
  points: Point[] = []
  eventTarget = new EventTarget()

  // in normalized coordinates
  addPoint(x: number, y: number) {
    const pointToAdd = new Point(x, y)
    pointToAdd.eventTarget.addEventListener('updated', () =>
      this.dispatchUpdatedEvent()
    )
    this.points = [...this.points, pointToAdd]
    this.dispatchUpdatedEvent()
    return pointToAdd
  }

  removePoint(point: Point) {
    this.points = this.points.filter((p) => p !== point)
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: this.points })
    )
  }
}
