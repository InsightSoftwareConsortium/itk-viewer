export class Points {
  points: number[][] = []
  pointUpdatedEmitter = new EventTarget()

  // deep copy
  getPoints() {
    return this.points.reduce(
      (line, point) => [...line, [...point]],
      [] as number[][]
    )
  }

  addObserver(cb: () => void) {
    this.pointUpdatedEmitter.addEventListener('updated', cb)
  }

  // in normalized coordinates
  addPoint(point: number[]) {
    this.points = [...this.points, point]
    const e = new Event('updated')
    this.pointUpdatedEmitter.dispatchEvent(e)
  }
}
