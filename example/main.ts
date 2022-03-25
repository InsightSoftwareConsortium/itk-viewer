import './style.css'
import { TfEditor } from '../lib/TfEditor'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div id='editorHome'></div>
`

const editorHome = document.querySelector<HTMLDivElement>('#editorHome')
if (editorHome) {
  const editor = new TfEditor(editorHome)
  console.log(editor.getPoints())
}
