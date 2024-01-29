import { describe, expect, beforeEach, it } from 'vitest'
import { BackgroundType, Background } from './Background'
import { ContainerType } from './Container'
import { makeTestableContainer } from './Container.test'
import { Points } from './Points'
import { ColorRange, ColorRangeType } from './ColorRange'

describe('Background', () => {
  let background: BackgroundType,
    container: ContainerType,
    parent: HTMLElement,
    points: Points,
    colorRange: ColorRangeType

  beforeEach(() => {
    ({ parent, container } = makeTestableContainer())
    points = new Points()
    colorRange = ColorRange()
    background = Background(container, points, colorRange)
  })

  it('Remove detaches background node', () => {
    expect(container.root.children.length).toBe(2)
    background.remove()
    expect(parent.children.length).toBe(1)
  })
})
