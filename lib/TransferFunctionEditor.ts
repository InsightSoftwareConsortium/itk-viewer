import { Container, iContainer } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'

export class TransferFunctionEditor {
  private points: Points
  // @ts-ignore pointController is all side effects
  private pointController: PointsController
  private container: iContainer

  constructor(mount: HTMLElement) {
    this.container = Container(mount)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ]
    startPoints.forEach(([x, y]) => this.points.addPoint(x, y))

    this.pointController = new PointsController(this.container, this.points)
  }

  remove() {
    this.container.remove()
  }

  getPoints() {
    return this.points.points.reduce(
      (line, point) => [...line, [point.x, point.y]],
      [] as number[][]
    )
  }

  setPoints(points: [number, number][]) {
    ;[...this.points.points].forEach((point) => {
      this.points.removePoint(point)
    })
    points.forEach(([x, y]) => this.points.addPoint(x, y))
  }

  get eventTarget() {
    return this.points.eventTarget
  }
}
