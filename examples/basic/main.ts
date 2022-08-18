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
    [0, 0],
    [0.4, 0.8],
    [0.6, 0.2],
    [1, 1],
  ])
  // eslint-disable-next-line no-console
  console.log('Control points', editor.getPoints())
  globalThis.editor = editor
}
