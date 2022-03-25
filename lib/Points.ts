export class Points {
  points: number[][] = []

  // deep copy
  getPoints() {
    return this.points.reduce(
      (line, point) => [...line, [...point]],
      [] as number[][]
    )
  }

  pointUpdatedEmitter = new EventTarget()
  addObserver(cb: () => void) {
    this.pointUpdatedEmitter.addEventListener('updated', cb)
  }

  // in normalized coordinates
  addPoint(point: number[]) {
    this.points = [...this.points, point]
    this.pointUpdatedEmitter.dispatchEvent(new Event('updated'))
  }
}
