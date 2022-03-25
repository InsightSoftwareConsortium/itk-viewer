// @vitest-environment happy-dom

import { expect, test } from 'vitest'
import { makeTestableContainer } from './Container.test'
import { Points } from './Points'
import { PointController } from './PointController'

test('Clicking adds a point', () => {
  const { container } = makeTestableContainer()

  const points = new Points()
  // eslint-disable-next-line no-unused-vars
  const controller = new PointController(container, points)

  const event = new PointerEvent('pointerdown', { bubbles: true })
  const { domElement } = container
  domElement.dispatchEvent(event)

  expect(points.getPoints().length).toBe(1)
})
