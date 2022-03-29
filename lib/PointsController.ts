import { iContainer } from './Container'
import { ControlPoint } from './ControlPoint'
import { Points } from './Points'

// Adds new Points to model and create view of the points
export class PointsController {
  container: iContainer
  points: Points
  private onPointsUpdated: () => void
  private controlPoints: ControlPoint[] = []

  constructor(container: iContainer, points: Points) {
    this.container = container
    this.points = points

    // update model
    const { domElement } = container
    domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e))

    // react to model
    this.onPointsUpdated = () => this.updatePoints()
    this.points.addObserver(this.onPointsUpdated)

    this.updatePoints()
  }

  remove() {
    this.points.removeObserver(this.onPointsUpdated)
  }

  onPointerDown(event: PointerEvent) {
    const [x, y] = this.container.toNormalized(event.clientX, event.clientY)
    this.points.addPoint([x, y])
  }

  onControlPointDelete(event: CustomEvent) {
    this.points.removePoint(event.detail.point)
  }

  updatePoints() {
    // delete removed ControlPoints
    const orphans = this.controlPoints.filter(
      (cp) => !this.points.points.find((point) => point === cp.point)
    )
    orphans.forEach((cp) => cp.remove())
    this.controlPoints = this.controlPoints.filter(
      (cp) => !orphans.includes(cp)
    )

    // add new ControlPoints
    const isPointInControlPoints = (point: number[]) =>
      this.controlPoints.find((cp) => cp.point === point)

    const addNewControlPoint = (point: number[]) =>
      this.controlPoints.push(
        new ControlPoint(this.container, point, (e) =>
          this.onControlPointDelete(e)
        )
      )

    this.points.points
      .filter((pointModel) => !isPointInControlPoints(pointModel))
      .forEach(addNewControlPoint)
  }
}
