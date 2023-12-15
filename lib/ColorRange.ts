import { Point } from './Point'
import { ControlPoint } from './ControlPoint'
import { ContainerType } from './Container'
import { ColorTransferFunction, rgbaToHexa } from './PiecewiseUtils'

export const ColorRange = () => {
  const points = [new Point(0, 0), new Point(1, 0)]
  const getPoints = () => points.sort((p1, p2) => p1.x - p2.x)
  const getColorRange = () => getPoints().map((p) => p.x)
  const eventTarget = new EventTarget()
  const setupPoint = (point: Point) => {
    point.eventTarget.addEventListener('updated', () => {
      if (point.y !== 0) point.y = 0
      eventTarget.dispatchEvent(
        new CustomEvent('updated', { detail: getColorRange() }),
      )
    })
  }
  points.forEach(setupPoint)

  return {
    getPoints,
    getColorRange,
    setColorRange: (normalized: Array<number>) => {
      getPoints().forEach((p, i) => {
        p.x = normalized[i]
      })
    },
    eventTarget,
  }
}

export type ColorRangeType = ReturnType<typeof ColorRange>

export const ColorRangeController = (
  container: ContainerType,
  colorRange: ColorRangeType,
) => {
  const points = colorRange.getPoints().map((p) => {
    const cp = new ControlPoint(container, p)
    cp.deletable = false
    return cp
  })

  // let colorTransferFunction: ColorTransferFunction
  const setColorTransferFunction = (ctf: ColorTransferFunction) => {
    const dataRange = ctf.getMappingRange()
    const low = [] as Array<number>
    ctf.getColor(dataRange[0], low)
    const high = [] as Array<number>
    ctf.getColor(dataRange[1], high)
    points[0].setColor(rgbaToHexa(low))
    points[1].setColor(rgbaToHexa(high))
  }

  return {
    points,
    setColorTransferFunction,
  }
}

export type ColorRangeControllerType = ReturnType<typeof ColorRangeController>
