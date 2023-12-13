import { beforeEach, describe, expect, it } from 'vitest'
import { PADDING } from './Container'
import { TransferFunctionEditor } from './TransferFunctionEditor'

const makeEditor = () => {
  const root = document.createElement('div')
  const editor = new TransferFunctionEditor(root)
  return { root, editor }
}

describe('TfEditor', () => {
  let root: HTMLDivElement, editor: TransferFunctionEditor

  beforeEach(() => {
    ;({ root, editor } = makeEditor())
  })

  it('Starts with 2 points', () => {
    expect(editor.getPoints().length).toBe(2)
  })

  it('Initial points are represented', () => {
    const pointElements = root.querySelectorAll('.controlPoint')
    expect(pointElements?.length).toBe(2)
  })

  it('Initial points are in lower left and upper right', () => {
    const [first, second] = root.querySelectorAll(
      '.controlPoint',
    ) as unknown as [Element, Element]
    const { top, bottom, left, right } = root.getBoundingClientRect()

    expect(Number(first.getAttribute('cx'))).toBe(PADDING)
    expect(Number(first.getAttribute('cy'))).toBe(bottom - PADDING)

    const width = right - left
    expect(Number(second.getAttribute('cx'))).toBe(width - PADDING)
    const height = bottom - top
    expect(Number(second.getAttribute('cy'))).toBe(height + PADDING)
  })

  it('Remove detaches all children nodes', () => {
    editor.remove()
    expect(root.children.length).toBe(0)
  })

  it('Set points', () => {
    const points = [
      [0, 0.3],
      [0.1, 0.1],
      [0.2, 0.3],
    ] as [number, number][]
    editor.setPoints(points)
    expect(editor.getPoints()).toEqual(points)
  })
})
