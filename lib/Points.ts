export class Points {
  private _points: number[][] = []
  private pointUpdatedEmitter = new EventTarget()

  // shallow copy
  get points() {
    return this._points.reduce(
      (line, point) => [...line, point],
      [] as number[][]
    )
  }

  addObserver(cb: () => void) {
    this.pointUpdatedEmitter.addEventListener('updated', cb)
  }

  removeObserver(cb: () => void) {
    this.pointUpdatedEmitter.removeEventListener('updated', cb)
  }

  // in normalized coordinates
  addPoint(point: number[]) {
    this._points = [...this._points, point]
    const e = new Event('updated')
    this.pointUpdatedEmitter.dispatchEvent(e)
  }
}
