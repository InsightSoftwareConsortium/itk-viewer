import { describe, expect, beforeEach, it, vi } from 'vitest'
import { makeTestableContainer } from './Container.test'
import { CONTROL_POINT_CLASS } from './ControlPoint'
import { Points } from './Points'
import { PointsController } from './PointsController'

describe('PointsController', async () => {
  let controller, container, points

  const expectPointCount = (count: number) => {
    // model
    expect(points.points.length).toBe(count)
    // view
    const domElementCount = container.domElement.querySelectorAll(
      `.${CONTROL_POINT_CLASS}`
    ).length
    expect(domElementCount).toBe(count)
  }

  beforeEach(async () => {
    ;({ container } = makeTestableContainer())
    points = new Points()
    controller = new PointsController(container, points)
  })

  it('Clicking adds a point', () => {
    const event = new PointerEvent('pointerdown', { bubbles: true })
    const { domElement } = container
    domElement.dispatchEvent(event)
    expectPointCount(1)
  })

  it('Clicking twice adds 2 points', () => {
    const event = new PointerEvent('pointerdown', { bubbles: true })
    const { domElement } = container
    domElement.dispatchEvent(event)
    domElement.dispatchEvent(event)
    expectPointCount(2)
  })

  it('Clicking a point deletes it', () => {
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true })
    const { domElement } = container
    domElement.dispatchEvent(pointerDown)

    const controlPointElement = container.domElement.querySelector(
      `.${CONTROL_POINT_CLASS}`
    )
    controlPointElement.dispatchEvent(pointerDown)

    expectPointCount(0)
  })

  it('remove cleans up Points callback', () => {
    const removeSpy = vi.spyOn(points, 'removeObserver')
    controller.remove()
    expect(removeSpy).toHaveBeenCalled()
  })
})
