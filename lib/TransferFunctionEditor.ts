import { Container, iContainer } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'

export class TransferFunctionEditor {
  points: Points

  pointController: PointsController
  container: iContainer

  constructor(mount: HTMLElement) {
    this.container = Container(mount)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ]
    startPoints.forEach(([x, y]) => this.points.addPoint(x, y))

    // eslint-disable-next-line no-unused-vars
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

  get eventTarget() {
    return this.points.eventTarget
  }
}
