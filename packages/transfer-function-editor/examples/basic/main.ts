import './style.css'
import { TransferFunctionEditor } from '../../lib/TransferFunctionEditor'

declare global {
  // eslint-disable-next-line
  var editor: TransferFunctionEditor
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div id='editorHome'></div>
`

const editorHome = document.querySelector<HTMLDivElement>('#editorHome')
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome)
  editor.setPoints([
    [0.1, 0],
    [0.4, 0.8],
    [0.6, 0.2],
    [0.9, 0.8],
  ])

  editor.setHistogram([0.1, 0.2, 0.2, 0.5, 0.4, 0.1])

  editor.setColorTransferFunction({
    getMappingRange: () => [0, 10],
    getUint8Table: () => new Uint8Array([255, 255, 255, 255]),
    getSize: () => 2,
    getColor: (_: number, rgba: Array<number>) => {
      rgba.splice(0, rgba.length, ...[0, 0, 0, 1])
    },
  })

  editor.setColorRange([0.2, 0.8])
  editor.setRange([0, 10])

  // eslint-disable-next-line no-console
  console.log('Control points', editor.getPoints())
  globalThis.editor = editor
}
