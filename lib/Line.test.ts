import { describe, expect, beforeEach, it, vi } from 'vitest'
import { iContainer } from './Container'
import { makeTestableContainer } from './Container.test'
import { Line } from './Line'
import { Points } from './Points'

describe('Line', () => {
  let line: Line, container: iContainer, points: Points

  beforeEach(() => {
    ;({ container } = makeTestableContainer())
    points = new Points()
    line = new Line(container, points)
  })

  it('Line adds point when new point is added', () => {
    points.addPoint(0, 0.4)
    const toRemove = points.addPoint(0, 0.5)
    points.addPoint(0, 0.5)
    points.removePoint(toRemove)
    const linePointCount =
      line.element.getAttribute('points')!.split(',').length - 1
    expect(linePointCount).toBe(4)
  })

  it('remove cleans up Points callback', () => {
    const removeSpy = vi.spyOn(points.eventTarget, 'removeEventListener')
    line.remove()
    expect(removeSpy).toHaveBeenCalled()
  })
})
