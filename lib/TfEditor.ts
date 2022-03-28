import { Container, iContainer } from './Container'
import { PointController } from './PointController'
import { Points } from './Points'

export class TfEditor {
  points: Points

  pointController: PointController
  container: iContainer

  constructor(mount: HTMLElement) {
    this.container = Container(mount)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ]
    startPoints.forEach((point) => this.points.addPoint(point))

    // eslint-disable-next-line no-unused-vars
    this.pointController = new PointController(this.container, this.points)
  }

  remove() {
    this.container.remove()
  }

  getPoints() {
    return this.points.getPoints()
  }
}
