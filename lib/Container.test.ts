import { beforeEach, describe, expect, it } from 'vitest'

import { Container } from './Container'

export const makeTestableContainer = () => {
  const root = document.createElement('div')
  return { container: Container(root), root }
}
describe('Container', () => {
  let root: HTMLDivElement, container

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
