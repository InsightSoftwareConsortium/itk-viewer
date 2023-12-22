import { Point } from './Point'
import { ControlPoint, FULL_RADIUS } from './ControlPoint'
import { ContainerType } from './Container'
import { ColorTransferFunction, rgbaToHexa } from './PiecewiseUtils'

const Y_OFFSET = -2.75 // pixels dom space

class ColorControlPoint extends ControlPoint {
  positionElement() {
    const { x } = this.point
    const [xSvg, bottom] = this.container.normalizedToSvg(x, 0)
    const ySvg = bottom + Y_OFFSET
    this.element.setAttribute('x', String(xSvg - FULL_RADIUS))
    this.element.setAttribute('y', String(ySvg))

    const dataValue = this.toDataSpace(x)
    this.tooltip.update(dataValue.toPrecision(4), xSvg, ySvg)
  }
}

export const ColorRange = () => {
  const points = [new Point(0, 0), new Point(1, 0)]
  const getPoints = () => points.sort((p1, p2) => p1.x - p2.x)
  const getColorRange = () => getPoints().map((p) => p.x)
  const eventTarget = new EventTarget()
  const dispachUpdated = () =>
    eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: getColorRange() }),
    )
  let batchUpdated = false
  const setupPoint = (point: Point) => {
    point.eventTarget.addEventListener('updated', () => {
      if (!batchUpdated) dispachUpdated()
    })
  }
  points.forEach(setupPoint)

  return {
    getPoints,
    getColorRange,
    setColorRange: (normalized: Array<number>) => {
      // Wait for all points to be updated before dispatching
      // Keeps update of first point from triggering update of second point in downstream app
      batchUpdated = true
      getPoints().forEach((p, i) => {
        p.x = normalized[i]
      })
      batchUpdated = false
      dispachUpdated()
    },
    eventTarget,
  }
}

export type ColorRangeType = ReturnType<typeof ColorRange>

export const ColorRangeController = (
  container: ContainerType,
  colorRange: ColorRangeType,
  toDataSpace: (x: number) => number,
) => {
  const center = new Point(0.5, Y_OFFSET)

  const levelControlPoint = new ColorControlPoint(
    container,
    center,
    toDataSpace,
  )
  levelControlPoint.deletable = false

  const points = colorRange.getPoints().map((p) => {
    const cp = new ColorControlPoint(container, p, toDataSpace)
    cp.deletable = false

    return cp
  })

  // optimizations to avoid circular update
  let updatingRangePoints = false
  let updatingCenter = false

  center.eventTarget.addEventListener('updated', () => {
    if (updatingCenter) return
    updatingRangePoints = true
    const width = points[1].point.x - points[0].point.x
    points[0].point.x = center.x - width / 2
    points[1].point.x = center.x + width / 2
    updatingRangePoints = false
  })

  let ctf: ColorTransferFunction

  const updatePointColors = () => {
    if (!ctf) return
    const dataRange = ctf.getMappingRange()
    const low = [] as Array<number>
    ctf.getColor(dataRange[0], low)
    const high = [] as Array<number>
    ctf.getColor(dataRange[1], high)
    const sorted = points.sort((p1, p2) => p1.point.x - p2.point.x)
    sorted[0].setColor(rgbaToHexa(low))
    sorted[1].setColor(rgbaToHexa(high))

    const middle = [] as Array<number>
    const center = (dataRange[1] - dataRange[0]) / 2 + dataRange[0]
    ctf.getColor(center, middle)
    levelControlPoint.setColor(rgbaToHexa(middle))
  }

  const setColorTransferFunction = (
    colorTransferFunction: ColorTransferFunction,
  ) => {
    ctf = colorTransferFunction
    updatePointColors()
  }

  colorRange.eventTarget.addEventListener('updated', () => {
    if (updatingRangePoints) return
    updatePointColors()
    const pointCount = colorRange.getPoints().length
    updatingCenter = true
    center.x =
      colorRange.getPoints().reduce((sum, p) => sum + p.x, 0) / pointCount
    updatingCenter = false
  })

  return {
    points,
    setColorTransferFunction,
  }
}

export type ColorRangeControllerType = ReturnType<typeof ColorRangeController>
