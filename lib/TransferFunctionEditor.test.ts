import { beforeEach, describe, expect, it } from 'vitest'
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
    expect(pointElements?.length).toBe(5) // 2 opacity points, 3 color range points
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

  it('Set color range', () => {
    editor.setColorRange([0.1, 0.5])
    expect(editor.getColorRange()).toEqual([0.1, 0.5])
  })
})
