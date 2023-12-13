import { describe, expect, beforeEach, it, vi } from 'vitest'
import { ContainerType } from './Container'
import { makeTestableContainer } from './Container.test'
import { CONTROL_POINT_CLASS } from './ControlPoint'
import { Points } from './Points'
import { PointsController } from './PointsController'

describe('PointsController', () => {
  let controller: PointsController, container: ContainerType, points: Points

  const expectPointCount = (count: number) => {
    // model
    expect(points.points.length).toBe(count)
    // view
    const pointCount = container.root.querySelectorAll(
      `.${CONTROL_POINT_CLASS}`,
    ).length
    expect(pointCount).toBe(count)
  }

  beforeEach(() => {
    ;({ container } = makeTestableContainer())
    points = new Points()
    controller = new PointsController(container, points)
  })

  it('Clicking adds a point', () => {
    const event = new PointerEvent('pointerdown', { bubbles: true })
    const { root } = container
    root.dispatchEvent(event)
    expectPointCount(1)
  })

  it('Clicking twice adds 2 points', () => {
    const event = new PointerEvent('pointerdown', { bubbles: true })
    const { root } = container
    root.dispatchEvent(event)
    root.dispatchEvent(event)
    expectPointCount(2)
  })

  it('Clicking a point deletes it', () => {
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true })
    const { root } = container
    root.dispatchEvent(pointerDown)

    const controlPointElement = container.root.querySelector(
      `.${CONTROL_POINT_CLASS}`,
    )
    controlPointElement?.dispatchEvent(pointerDown)

    const pointerUp = new PointerEvent('pointerup', { bubbles: true })
    document.dispatchEvent(pointerUp)

    expectPointCount(0)
  })

  it('New point appears where click happens', () => {
    const { root } = container
    const { left, top, width, height } = root.getBoundingClientRect()

    const upperLeft = new PointerEvent('pointerdown', {
      clientX: left,
      clientY: top,
      bubbles: true,
    })
    root.dispatchEvent(upperLeft)
    let { x: normX, y: normY } = points.points[0]
    expect(normX).toBe(0)
    expect(normY).toBe(1)

    const middle = new PointerEvent('pointerdown', {
      clientX: left + width / 2,
      clientY: top + height / 2,
      bubbles: true,
    })
    root.dispatchEvent(middle)
    ;({ x: normX, y: normY } = points.points[1])
    expect(normX).toBe(0.5)
    expect(normY).toBe(0.5)
  })

  it('remove cleans up Points callback', () => {
    const removeSpy = vi.spyOn(points.eventTarget, 'removeEventListener')
    controller.remove()
    expect(removeSpy).toHaveBeenCalled()
  })
})
