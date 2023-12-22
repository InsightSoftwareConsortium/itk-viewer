import { ContainerType } from './Container'
import { ControlPoint, clamp0to1 } from './ControlPoint'
import { Point } from './Point'
import { Points } from './Points'

// Adds new Points to model and create view of the points
export class PointsController {
  container: ContainerType
  points: Points
  private onPointsUpdated: () => void
  private controlPoints: ControlPoint[] = []
  private isNewPointFromPointer = false
  private toDataSpace: (x: number) => number

  constructor(
    container: ContainerType,
    points: Points,
    toDataSpace: (x: number) => number,
  ) {
    this.container = container
    this.points = points
    this.toDataSpace = toDataSpace

    // update model
    const { root } = container
    root.addEventListener('pointerdown', (e) => this.onPointerDown(e))

    // react to model
    this.onPointsUpdated = () => this.updatePoints()
    this.points.eventTarget.addEventListener('updated', this.onPointsUpdated)

    this.updatePoints()
  }

  remove() {
    this.points.eventTarget.removeEventListener('updated', this.onPointsUpdated)
  }

  onPointerDown(event: PointerEvent) {
    const [x, y] = this.container
      .domToNormalized(event.clientX, event.clientY)
      .map(clamp0to1)
    this.isNewPointFromPointer = true
    this.points.addPoint(x, y)
    this.isNewPointFromPointer = false
  }

  onControlPointDelete(event: CustomEvent) {
    this.points.removePoint(event.detail.point)
  }

  updatePoints() {
    // delete removed ControlPoints
    const orphans = this.controlPoints.filter(
      (cp) => !this.points.points.find((point) => point === cp.point),
    )
    orphans.forEach((cp) => cp.remove())
    this.controlPoints = this.controlPoints.filter(
      (cp) => !orphans.includes(cp),
    )

    // add new ControlPoints
    const isPointInControlPoints = (point: Point) =>
      this.controlPoints.find((cp) => cp.point === point)

    const addNewControlPoint = (point: Point) =>
      this.controlPoints.push(
        new ControlPoint(
          this.container,
          point,
          this.toDataSpace,
          (e) => this.onControlPointDelete(e),
          this.isNewPointFromPointer,
        ),
      )

    this.points.points
      .filter((pointModel) => !isPointInControlPoints(pointModel))
      .forEach(addNewControlPoint)
  }
}
