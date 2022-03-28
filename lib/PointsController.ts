import { iContainer } from './Container'
import { ControlPoint } from './ControlPoint'
import { Points } from './Points'

// Adds new Points to model and create view of the points
export class PointsController {
  container: iContainer
  updateCallback: () => void
  points: Points
  controlPoints: ControlPoint[]

  constructor(container: iContainer, points: Points) {
    this.container = container
    this.points = points

    this.controlPoints = this.points.points.map(
      (point) => new ControlPoint(this.container, point)
    )

    // update model
    const { domElement } = container
    domElement.addEventListener('pointerdown', () => this.onPointerDown())

    // react to model
    this.updateCallback = () => this.onPointsUpdated()
    this.points.addObserver(this.updateCallback)
  }

  remove() {
    this.points.removeObserver(this.updateCallback)
  }

  onPointerDown() {
    this.points.addPoint([0.5, 0.5])
  }

  onPointsUpdated() {
    // add new ControlPoints
    const addNewControlPoint = (point: number[]) =>
      this.controlPoints.push(new ControlPoint(this.container, point))

    const isPointInControlPoints = (point: number[]) =>
      this.controlPoints.find((cp) => cp.point === point)

    this.points.points
      .filter((pointModel) => !isPointInControlPoints(pointModel))
      .forEach(addNewControlPoint)

    // delete removed ControlPoints
  }
}
