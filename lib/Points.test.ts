import { expect, test } from 'vitest'
import { Points } from './Points'

test('Adding point triggers callback', () => {
  const points = new Points()

  let hasFired = false
  points.addObserver(() => (hasFired = true))
  points.addPoint([1, 1])
  expect(hasFired).toBe(true)
})
