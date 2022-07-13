import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Container, ContainerType, PADDING } from './Container'

const CONTAINER_WIDTH = 100
const CONTAINER_HEIGHT = 50

const LEFT = 100
const TOP = 10

export const makeTestableContainer = () => {
  const root = document.createElement('div')
  const container = Container(root)

  // mock size
  const svgElement = Array.from(root.children).find(
    (element) => element.nodeName === 'SVG'
  ) as typeof container.domElement
  vi.spyOn(svgElement, 'getBoundingClientRect').mockImplementation(() => ({
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

  return { container, root }
}

describe('Container', () => {
  let root: HTMLDivElement, container: ContainerType

  beforeEach(() => {
    ;({ root, container } = makeTestableContainer())
  })

  it('SVG element added to root', () => {
    const svgElement = Array.from(root.children).find(
      (element) => element.nodeName === 'SVG'
    )
    expect(svgElement).toBeTruthy()
  })

  it('Remove unmounts svg', () => {
    container.remove()
    expect(root.children.length).toBe(0)
  })

  it('setViewBox works', () => {
    container.setViewBox(0.25, 0.5, 0.1, 0.5)
    let [domX, domY] = container.normalizedToSvg(0.5, 0.5)
    expect(domX).toBe(CONTAINER_WIDTH - PADDING)
    expect(domY).toBe(PADDING)
    ;[domX, domY] = container.normalizedToSvg(0.25, 0.1)
    expect(domX).toBe(PADDING)
    expect(domY).toBe(CONTAINER_HEIGHT - PADDING)

    const [normX, normY] = container.domToNormalized(
      LEFT + CONTAINER_WIDTH - PADDING,
      TOP + PADDING
    )
    expect(normX).toBe(0.5)
    expect(normY).toBe(0.5)
  })
})
