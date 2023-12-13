import { Container, ContainerType } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'
import { Line } from './Line'
import { WheelZoom } from './WheelZoom'
import { Background, BackgroundType } from './Background'
import { ColorTransferFunction, logTransform } from './PiecewiseUtils'

export { windowPointsForSort } from './PiecewiseUtils'

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
    ] as [number, number][]
    this.points.setPoints(startPoints)

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

  // No Points update event on setPoints to avoid emitting 'update' event to user code.
  // User code responsible for updating downstream piecewise function without update in setPoints case.
  setPoints(points: [number, number][]) {
    this.points.setPoints(points)
    this.pointController.updatePoints()
    this.line.update()
    this.background.render()
  }

  get eventTarget() {
    return this.points.eventTarget
  }

  setViewBox(
    valueStart: number,
    valueEnd: number,
    opacityMin = 0,
    opacityMax = 1,
  ) {
    this.container.setViewBox(valueStart, valueEnd, opacityMin, opacityMax)
  }

  setColorTransferFunction(ctf: ColorTransferFunction) {
    this.background.setColorTransferFunction(ctf)
  }

  setHistogram(histogram: number[]) {
    this.background.setHistogram(logTransform(histogram))
  }
}
