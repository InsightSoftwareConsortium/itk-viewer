// @vitest-environment happy-dom

import { expect, test } from 'vitest'

import { TfEditor } from './TfEditor'

test('Starts with 2 points', () => {
  const root = document.createElement('div')
  const { points } = TfEditor(root)
  expect(points.length).toBe(2)
})

test('Initial points are represented', () => {
  const root = document.createElement('div')
  TfEditor(root)
  const svgElement = Array.from(root.children).find(element => element.nodeName === 'SVG')
  const pointElements = svgElement.querySelectorAll('.controlPoint')
  expect(pointElements.length).toBe(2)
})

test('Initial points are in lower left and upper right', () => {
  const root = document.createElement('div')
  TfEditor(root)
  const svgElement = Array.from(root.children).find(element => element.nodeName === 'SVG')
  const [first] = svgElement.querySelectorAll('.controlPoint')
  expect(first.getAttribute('cx')).toBe('0')

  // get height of container
  // compare to y of first point
})
