import { Container, ContainerType } from './Container'
import { PointsController } from './PointsController'
import { Points } from './Points'
import { Line } from './Line'
import { WheelZoom } from './WheelZoom'
import { Background, BackgroundType } from './Background'
import { ColorTransferFunction, logTransform } from './PiecewiseUtils'
import {
  ColorRange,
  ColorRangeController,
  ColorRangeControllerType,
  ColorRangeType,
} from './ColorRange'
import { AxisLabels } from './AxisLabels'
import { createDataRange } from './DataRange'

export { windowPointsForSort } from './PiecewiseUtils'

const ZOOM_AXIS_LABELS_TIMEOUT = 2000

export class TransferFunctionEditor {
  public eventTarget = new EventTarget()

  private points: Points
  private colorRange: ColorRangeType
  private colorRangeController: ColorRangeControllerType
  private line: Line
  private pointController: PointsController
  private container: ContainerType
  private background: BackgroundType

  private dataRange = createDataRange()

  constructor(root: HTMLElement) {
    this.container = Container(root)
    WheelZoom(this.container)

    this.points = new Points()
    const startPoints = [
      [0, 0],
      [1, 1],
    ] as [number, number][]
    this.points.setPoints(startPoints)

    this.line = new Line(this.container, this.points)
    this.pointController = new PointsController(
      this.container,
      this.points,
      this.dataRange.toDataSpace,
    )

    const { createSetVisibilityGate } = AxisLabels(
      this.container,
      this.dataRange,
    )

    this.colorRange = ColorRange()
    this.colorRangeController = ColorRangeController(
      this.container,
      this.colorRange,
      this.dataRange.toDataSpace,
    )
    this.background = Background(this.container, this.points, this.colorRange)

    this.points.eventTarget.addEventListener('updated', (e) => {
      this.eventTarget.dispatchEvent(
        new CustomEvent('updated', { detail: (e as CustomEvent).detail }),
      )
    })
    this.colorRange.eventTarget.addEventListener('updated', (e) => {
      this.eventTarget.dispatchEvent(
        new CustomEvent('colorRange', { detail: (e as CustomEvent).detail }),
      )
    })

    // show axis labels when hovering on Control Point or changing viewbox (zooming)
    const setOpacityHovering = createSetVisibilityGate()
    this.pointController.eventTarget.addEventListener(
      'hovered-updated',
      (e) => {
        const { hovered } = (e as CustomEvent).detail
        setOpacityHovering(hovered)
      },
    )
    const setColorHovering = createSetVisibilityGate()
    this.colorRangeController.eventTarget.addEventListener(
      'hovered-updated',
      (e) => {
        const { hovered } = (e as CustomEvent).detail
        setColorHovering(hovered)
      },
    )
    const setZooming = createSetVisibilityGate()
    let debounceTimeout: ReturnType<typeof setTimeout>
    this.container.eventTarget.addEventListener('viewbox-updated', () => {
      setZooming(true)
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => {
        setZooming(false)
      }, ZOOM_AXIS_LABELS_TIMEOUT)
    })
  }

  remove() {
    this.background.remove()
    this.container.remove()
  }

  getPoints() {
    return this.points.points.map(({ x, y }) => [x, y])
  }

  // No Points update event emitted on setPoints event to user code.  Avoids circular
  // User code responsible for updating downstream piecewise function without update in setPoints case.
  setPoints(points: [number, number][]) {
    this.points.setPoints(points)
    this.pointController.updatePoints()
    this.line.update()
    this.background.render()
  }

  getColorRange() {
    return this.colorRange.getColorRange()
  }

  setColorRange(normalized: Array<number>) {
    return this.colorRange.setColorRange(normalized)
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
    this.colorRangeController.setColorTransferFunction(ctf)
  }

  setHistogram(histogram: number[]) {
    this.background.setHistogram(logTransform(histogram))
  }

  setRange(range: [number, number]) {
    this.dataRange.setRange(range)
  }
}
