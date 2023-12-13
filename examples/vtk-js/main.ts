import './style.css'
import { throttle } from '@kitware/vtk.js/macros'
import {
  TransferFunctionEditor,
  windowPointsForSort,
} from '../../lib/TransferFunctionEditor'
import { Point } from '../../lib/Point'

const OPACITY_UPDATE_DELAY = 100
const DATA_RANGE = [0, 255]

declare global {
  // eslint-disable-next-line
  var renderWindow: any, ofun: any, ctfun: any
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div>
    <h3>Transfer Function</h3>
    <p>Click on empty space to drop a point.  Click a point without dragging to delete.</p>
    <div id='editorHome'></div>
  </div>
`
// rescales into data range space
const getNodes = (range: number[], points: Point[]) => {
  const delta = range[1] - range[0]
  const windowedPoints = windowPointsForSort(points.map(({ x, y }) => [x, y]))
  return windowedPoints.map(([x, y]) => ({
    x: range[0] + delta * x,
    y,
    midpoint: 0.5,
    sharpness: 0,
  }))
}

const opacityFunction = globalThis.ofun
const colorFunction = globalThis.ctfun
const editorHome = document.querySelector<HTMLDivElement>('#editorHome')
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome)
  editor.setColorTransferFunction(colorFunction)

  const updateViewerOpacityFunction = throttle((e) => {
    const points = (<CustomEvent>e).detail as Point[]
    const nodes = getNodes(DATA_RANGE, points)
    opacityFunction.setNodes(nodes)
    colorFunction.setRange(nodes[0].x, nodes[nodes.length - 1].x)

    globalThis.renderWindow.render()
  }, OPACITY_UPDATE_DELAY)

  editor.eventTarget.addEventListener('updated', updateViewerOpacityFunction)
}
