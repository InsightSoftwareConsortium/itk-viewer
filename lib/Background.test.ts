import { describe, expect, beforeEach, it } from 'vitest'
import { BackgroundType, Background } from './Background'
import { ContainerType } from './Container'
import { makeTestableContainer } from './Container.test'

describe('Background', () => {
  let background: BackgroundType, container: ContainerType, parent: HTMLElement

  beforeEach(() => {
    ;({ parent, container } = makeTestableContainer())
    background = Background(container)
  })

  it('Remove detaches background node', () => {
    expect(container.root.children.length).toBe(2)
    background.remove()
    expect(parent.children.length).toBe(1)
  })
})
