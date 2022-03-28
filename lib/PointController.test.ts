import { describe, expect, beforeEach, it } from 'vitest'
import { makeTestableContainer } from './Container.test'
import { Points } from './Points'
import { PointController } from './PointController'

describe('PointController', async() => {
  let controller, container, points

  beforeEach(async() => {
    ;({ container } = makeTestableContainer())
    points = new Points()
    new PointController(container, points)
  })

  it('Clicking adds a point', () => {
    const event = new PointerEvent('pointerdown', { bubbles: true })
    const { domElement } = container
    domElement.dispatchEvent(event)

    expect(points.getPoints().length).toBe(1)
  })
})
