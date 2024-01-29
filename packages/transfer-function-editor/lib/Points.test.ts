import { expect, describe, beforeEach, it } from 'vitest'
import { Points } from './Points'

describe('PointController', async () => {
  let points: Points

  beforeEach(async () => {
    points = new Points()
  })

  it('Adding point triggers callback', () => {
    let hasFired = false
    points.eventTarget.addEventListener('updated', () => (hasFired = true))
    points.addPoint(1, 1)
    expect(hasFired).toBe(true)
  })

  it('Moving a point triggers update callback', () => {
    const points = new Points()
    const point = points.addPoint(0, 0)

    let hasFired = false
    points.eventTarget.addEventListener('updated', () => (hasFired = true))
    point.x = 0.5

    expect(hasFired).toBe(true)
  })
})
