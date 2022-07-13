import { Container, ContainerType } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'
import { Line } from './Line'

export class TransferFunctionEditor {
  private points: Points
  // @ts-ignore declared but never read as pointController is all side effects
  private pointController: PointsController
  // @ts-ignore
  private line: Line
  private container: ContainerType

  constructor(mount: HTMLElement) {
    this.container = Container(mount)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ]
    startPoints.forEach(([x, y]) => this.points.addPoint(x, y))

    this.line = new Line(this.container, this.points)
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

  setViewBox(
    valueStart: number,
    valueEnd: number,
    opacityMin = 0,
    opacityMax = 1
  ) {
    this.container.setViewBox(valueStart, valueEnd, opacityMin, opacityMax)
  }
}
