import { describe, expect, beforeEach, it } from 'vitest'
import { BackgroundType, Background } from './Background'
import { ContainerType } from './Container'
import { makeTestableContainer } from './Container.test'
import { Points } from './Points'

describe('Background', () => {
  let background: BackgroundType,
    container: ContainerType,
    parent: HTMLElement,
    points: Points

  beforeEach(() => {
    ;({ parent, container } = makeTestableContainer())
    points = new Points()
    background = Background(container, points)
  })

  it('Remove detaches background node', () => {
    expect(container.root.children.length).toBe(2)
    background.remove()
    expect(parent.children.length).toBe(1)
  })
})
