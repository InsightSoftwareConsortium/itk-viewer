import './style.css'
import { TfEditor } from '../lib/TfEditor'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div id='lutHome'></div>
`

const lutHome = document.querySelector<HTMLDivElement>('#lutHome')
if (lutHome) { TfEditor(lutHome) }
