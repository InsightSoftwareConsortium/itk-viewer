import { expect, describe, beforeEach, it } from 'vitest'
import { Points } from './Points'

describe('PointController', async () => {
  let points

  beforeEach(async () => {
    points = new Points()
  })

  it('Adding point triggers callback', () => {
    let hasFired = false
    points.addObserver(() => (hasFired = true))
    points.addPoint([1, 1])
    expect(hasFired).toBe(true)
  })

  it('Remove callback stops a callback from being fired', () => {
    const points = new Points()

    let hasFired = false
    const cb = () => (hasFired = true)
    points.addObserver(cb)
    points.removeObserver(cb)
    points.addPoint([1, 1])
    expect(hasFired).toBe(false)
  })
})
