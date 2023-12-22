import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Container, ContainerType, PADDING } from './Container'

const CONTAINER_WIDTH = 100
const CONTAINER_HEIGHT = 50

const LEFT = 100
const TOP = 10

export const makeTestableContainer = () => {
  const parent = document.createElement('div')
  const container = Container(parent)

  // mock size
  vi.spyOn(container.root, 'getBoundingClientRect').mockImplementation(() => ({
    left: LEFT,
    right: LEFT + CONTAINER_WIDTH,
    top: TOP,
    bottom: TOP + CONTAINER_HEIGHT,
    height: CONTAINER_HEIGHT,
    width: CONTAINER_WIDTH,
    x: LEFT,
    y: TOP,
    toJSON: () => {},
  }))

  return { container, parent }
}

describe('Container', () => {
  let parent: HTMLDivElement, container: ContainerType

  beforeEach(() => {
    ;({ parent, container } = makeTestableContainer())
  })

  it('SVG element added to root', () => {
    const svgElement = Array.from(container.root.children).find(
      (element) => element.nodeName === 'SVG',
    )
    expect(svgElement).toBeTruthy()
  })

  it('Remove unmounts root', () => {
    container.remove()
    expect(parent.children.length).toBe(0)
  })

  it('setViewBox influences normalizedToSvg and domToNormalized', () => {
    container.setViewBox(0.25, 0.5, 0.1, 0.5)
    let [domX] = container.normalizedToSvg(0.5, 0.5)
    expect(domX).toBe(CONTAINER_WIDTH - PADDING)
    ;[domX] = container.normalizedToSvg(0.25, 0.1)
    expect(domX).toBe(PADDING)

    const [normX, normY] = container.domToNormalized(
      LEFT + CONTAINER_WIDTH - PADDING,
      TOP + PADDING,
    )
    expect(normX).toBe(0.5)
    expect(normY).toBe(0.5)
  })
})
