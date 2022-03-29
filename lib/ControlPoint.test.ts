import { describe, expect, beforeEach, it } from 'vitest'
import { makeTestableContainer } from './Container.test'
import { ControlPoint } from './ControlPoint'

describe('ControlPoint', async () => {
  let controlPoint, point

  beforeEach(async () => {
    const { container } = makeTestableContainer()
    point = [0, 0]
    controlPoint = new ControlPoint(container, point)
  })

  it('Clicking and dragging moves the model point', () => {
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true })

    controlPoint.element.dispatchEvent(pointerDown)

    const pointerMove = new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 10,
    })
    document.dispatchEvent(pointerMove)

    expect(point[0]).not.toBe(0)
  })

  it('Clicking ControlPoint without moving fires delete event', () => {
    let shouldDelete = false
    const cb = () => (shouldDelete = true)
    controlPoint.eventTarget.addEventListener(controlPoint.DELETE_EVENT, cb)

    const pointerDown = new PointerEvent('pointerdown', { bubbles: true })
    controlPoint.element.dispatchEvent(pointerDown)

    const pointerUp = new PointerEvent('pointerup', { bubbles: true })
    document.dispatchEvent(pointerUp)

    expect(shouldDelete).toBe(true)
  })

  it('Clicking ControlPoint, moving, then pointer up does not fire delete event', () => {
    let shouldDelete = false
    const cb = () => (shouldDelete = true)
    controlPoint.eventTarget.addEventListener(controlPoint.DELETE_EVENT, cb)

    const pointerDown = new PointerEvent('pointerdown', { bubbles: true })
    controlPoint.element.dispatchEvent(pointerDown)

    const pointerMove = new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 10,
    })
    document.dispatchEvent(pointerMove)

    const pointerUp = new PointerEvent('pointerup', { bubbles: true })
    document.dispatchEvent(pointerUp)

    expect(shouldDelete).toBe(false)
  })
})
