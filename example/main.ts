import './style.css'
import { TransferFunctionEditor } from '../lib/TransferFunctionEditor'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div id='editorHome'></div>
`

const editorHome = document.querySelector<HTMLDivElement>('#editorHome')
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome)
  console.log('Control points', editor.getPoints())
}
