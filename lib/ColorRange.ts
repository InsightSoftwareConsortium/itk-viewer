import { Point } from './Point'
import { ControlPoint } from './ControlPoint'
import { ContainerType } from './Container'

export const ColorRange = () => {
  const pointStart = new Point(0, 0)
  const pointEnd = new Point(1, 0)
  const eventTarget = new EventTarget()
  const setupPoint = (point: Point) => {
    point.eventTarget.addEventListener('updated', () => {
      if (point.y !== 0) point.y = 0
      eventTarget.dispatchEvent(
        new CustomEvent('updated', { detail: [pointStart.x, pointEnd.x] }),
      )
    })
  }
  setupPoint(pointStart)
  setupPoint(pointEnd)
  return {
    getPoints: () => [pointStart, pointEnd],
    getColorRange: () => [pointStart.x, pointEnd.x],
    setColorRange: (normalizedStart: number, normalizedEnd: number) => {
      pointStart.x = normalizedStart
      pointEnd.x = normalizedEnd
    },
    eventTarget,
  }
}

export type ColorRangeType = ReturnType<typeof ColorRange>

export const ColorRangeController = (
  container: ContainerType,
  colorRange: ColorRangeType,
) => {
  const [pointStart, pointEnd] = colorRange.getPoints()
  const start = new ControlPoint(container, pointStart)
  const end = new ControlPoint(container, pointEnd)

  return { start, end }
}

export type ColorRangeControllerType = ReturnType<typeof ColorRangeController>
