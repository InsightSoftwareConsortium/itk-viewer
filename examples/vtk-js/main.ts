import './style.css'
import { throttle } from '@kitware/vtk.js/macros'
import { TransferFunctionEditor } from '../../lib/TransferFunctionEditor'
import { Point } from '../../lib/Point'

const OPACITY_UPDATE_DELAY = 100
const MAX_SCALAR = 255

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

  const opacityFunction = globalThis.ofun
  const updateViewerOpacityFunction = throttle((e) => {
    const points = (<CustomEvent>e).detail as Point[]
    opacityFunction.removeAllPoints()
    points.forEach(({ x, y }) => {
      opacityFunction.addPoint(x * MAX_SCALAR, y)
    })
    globalThis.renderWindow.render()
  }, OPACITY_UPDATE_DELAY)

  editor.eventTarget.addEventListener('updated', updateViewerOpacityFunction)
}
