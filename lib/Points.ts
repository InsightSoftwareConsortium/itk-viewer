export class Points {
  private _points: number[][] = []
  eventTarget = new EventTarget()

  // shallow copy
  get points() {
    return this._points.reduce(
      (line, point) => [...line, point],
      [] as number[][]
    )
  }

  addObserver(cb: () => void) {
    this.eventTarget.addEventListener('updated', cb)
  }

  removeObserver(cb: () => void) {
    this.eventTarget.removeEventListener('updated', cb)
  }

  // in normalized coordinates
  addPoint(point: number[]) {
    this._points = [...this._points, point]
    this.dispatchUpdatedEvent()
  }

  removePoint(point: number[]) {
    this._points = this._points.filter((p) => p !== point)
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: this.points })
    )
  }
}
