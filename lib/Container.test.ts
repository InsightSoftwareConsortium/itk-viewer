// @vitest-environment happy-dom

import { expect, test } from 'vitest'

import { Container } from './Container'

test('SVG element added to root', () => {
  const root = document.createElement('div')
  Container(root)
  const svgElement = Array.from(root.children).find(element => element.nodeName === 'SVG')
  expect(svgElement).toBeTruthy()
})
