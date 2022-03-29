import './style.css'
import { TransferFunctionEditor } from '../../lib/TransferFunctionEditor'
import { Point } from '../../lib/Point'

declare global {
  // eslint-disable-next-line
  var renderWindow: any
  // eslint-disable-next-line
  var ofun: any
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div id='editorHome'></div>
`

const editorHome = document.querySelector<HTMLDivElement>('#editorHome')
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome)

  const MAX_SCALAR = 255
  const opacityFunction = globalThis.ofun
  editor.eventTarget.addEventListener('updated', (e) => {
    const points = (<CustomEvent>e).detail as Point[]
    opacityFunction.removeAllPoints()
    points.forEach(({ x, y }) => {
      opacityFunction.addPoint(x * MAX_SCALAR, y)
    })
    globalThis.renderWindow.render()
  })
}
