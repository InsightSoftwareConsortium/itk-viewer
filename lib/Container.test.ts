import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Container, iContainer } from './Container'

export const makeTestableContainer = () => {
  const root = document.createElement('div')
  const container = Container(root)

  // mock size
  const svgElement = Array.from(root.children).find(
    (element) => element.nodeName === 'SVG'
  ) as typeof container.domElement
  vi.spyOn(svgElement, 'getBoundingClientRect').mockImplementation(() => ({
    left: 100,
    right: 200,
    top: 50,
    bottom: 150,
    height: 100,
    width: 100,
    x: 100,
    y: 100,
    toJSON: () => {},
  }))

  return { container, root }
}

describe('Container', () => {
  let root: HTMLDivElement, container: iContainer

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
})
