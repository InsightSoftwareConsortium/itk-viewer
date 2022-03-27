import { expect, test } from 'vitest'
import { TfEditor } from './TfEditor'

const makeEditor = () => {
  const root = document.createElement('div')
  // eslint-disable-next-line no-new
  new TfEditor(root)
  return root
}

test('Starts with 2 points', () => {
  const root = document.createElement('div')
  const editor = new TfEditor(root)
  expect(editor.getPoints().length).toBe(2)
})

test('Initial points are represented', () => {
  const root = makeEditor()
  const svgElement = Array.from(root.children).find(
    (element) => element.nodeName === 'SVG'
  )
  const pointElements = svgElement.querySelectorAll('.controlPoint')
  expect(pointElements.length).toBe(2)
})

test('Initial points are in lower left and upper right', () => {
  const root = makeEditor()
  const svgElement = Array.from(root.children).find(
    (element) => element.nodeName === 'SVG'
  )
  const [first, second] = svgElement.querySelectorAll('.controlPoint')
  const { top, bottom, left, right } = root.getBoundingClientRect()

  expect(Number(first.getAttribute('cx'))).toBe(0)
  expect(Number(first.getAttribute('cy'))).toBe(bottom)

  const width = right - left
  expect(Number(second.getAttribute('cx'))).toBe(width)
  const height = bottom - top
  expect(Number(second.getAttribute('cy'))).toBe(height)
})
