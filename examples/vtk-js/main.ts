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

  globalThis.editor = editor
}
