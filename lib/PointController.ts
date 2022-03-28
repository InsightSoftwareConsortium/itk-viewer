import { iContainer } from './Container'
import { ControlPoint } from './ControlPoint'
import { Points } from './Points'

// Adds new Points to model and creates view of the points
export class PointController {
  container: iContainer
  points: Points
  controlPoints: ControlPoint[]

  constructor(container: iContainer, points: Points) {
    this.container = container
    this.points = points

    this.controlPoints = this.points
      .getPoints()
      .map((point) => new ControlPoint(this.container, point))

    const { domElement } = container
    domElement.addEventListener('pointerdown', () => this.onPointerDown())

    this.points.addObserver(() => this.onPointsUpdated())
  }

  onPointerDown() {
    this.points.addPoint([0.5, 0.5])
  }

  onPointsUpdated() {}
}
