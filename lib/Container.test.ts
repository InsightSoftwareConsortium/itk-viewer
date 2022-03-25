// @vitest-environment happy-dom

import { expect, test } from 'vitest'

import { Container } from './Container'

export const makeTestableContainer = () => {
  const root = document.createElement('div')
  return { container: Container(root), root }
}

test('SVG element added to root', () => {
  const { root } = makeTestableContainer()
  const svgElement = Array.from(root.children).find(
    (element) => element.nodeName === 'SVG'
  )
  expect(svgElement).toBeTruthy()
})
