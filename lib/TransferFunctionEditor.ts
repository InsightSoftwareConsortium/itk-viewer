import { Container, ContainerType } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'
import { Line } from './Line'
import { WheelZoom } from './WheelZoom'
import { Background, BackgroundType } from './Background'
import { ColorTransferFunction } from './PiecewiseUtils'

export { windowPoints } from './Points'

export class TransferFunctionEditor {
  private points: Points
  // @ts-ignore declared but never read
  private line: Line
  // @ts-ignore
  private pointController: PointsController
  private container: ContainerType
  private background: BackgroundType

  constructor(root: HTMLElement) {
    this.container = Container(root)
    WheelZoom(this.container)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ]
    startPoints.forEach(([x, y]) => this.points.addPoint(x, y))

    this.background = Background(this.container, this.points)

    this.line = new Line(this.container, this.points)
    this.pointController = new PointsController(this.container, this.points)
  }

  remove() {
    this.background.remove()
    this.container.remove()
  }

  getPoints() {
    return this.points.points.map(({ x, y }) => [x, y])
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

  setColorTransferFunction(ctf: ColorTransferFunction) {
    this.background.setColorTransferFunction(ctf)
  }
}
