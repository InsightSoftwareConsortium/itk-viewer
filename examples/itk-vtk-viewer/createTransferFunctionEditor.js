import { throttle } from '@kitware/vtk.js/macros'
import {
  TransferFunctionEditor,
  windowPoints,
} from '../../lib/TransferFunctionEditor'

const PIECEWISE_UPDATE_DELAY = 100

const getNodes = (range, points) => {
  const delta = range[1] - range[0]
  const windowedPoints = windowPoints(points)
  // avoid unstable Array.sort issues
  windowedPoints[0][0] -= 1e-8
  windowedPoints[windowedPoints.length - 1][0] += 1e-8
  return windowedPoints.map(([x, y]) => ({
    x: range[0] + delta * x,
    y,
    midpoint: 0.5,
    sharpness: 0,
  }))
}

const getRange = (nodes, dataRange) =>
  nodes.length > 1 ? [nodes[0].x, nodes[nodes.length - 1].x] : dataRange

const updateContextPiecewiseFunction = (context, dataRange, points) => {
  const name = context.images.selectedName
  const actorContext = context.images.actorContext.get(name)
  const component = actorContext.selectedComponent
  const nodes = getNodes(dataRange, points)
  const range = getRange(nodes, dataRange)
  context.service.send({
    type: 'IMAGE_PIECEWISE_FUNCTION_CHANGED',
    data: {
      name,
      component,
      range,
      nodes,
    },
  })
}

const noop = () => undefined
const vtkPiecewiseGaussianWidgetFacade = (tfEditor, context) => {
  let dataRange = [0, 255]

  const update = () =>
    updateContextPiecewiseFunction(context, dataRange, tfEditor.getPoints())

  const throttledUpdate = throttle(update, PIECEWISE_UPDATE_DELAY)
  tfEditor.eventTarget.addEventListener('updated', throttledUpdate)

  const getOpacityNodes = () => getNodes(dataRange, tfEditor.getPoints())

  return {
    setColorTransferFunction: (tf) => {
      tfEditor.setColorTransferFunction(tf)
    },

    render: noop,

    getGaussians() {
      const xPositions = tfEditor.getPoints().map(([x]) => x)
      const min = Math.min(...xPositions)
      const width = (Math.max(...xPositions) - min) / 2
      const position = min + width
      const height = Math.max(...tfEditor.getPoints().map(([, y]) => y))

      return [{ width, position, height, min }]
    },

    setGaussians(gaussians) {
      const newG = gaussians[0]
      const oldG = this.getGaussians()[0]
      const heightDelta = newG.height - oldG.height

      const oldMin = oldG.position - oldG.width
      const newMin = newG.position - newG.width
      const newRange = 2 * newG.width

      const points = tfEditor
        .getPoints()
        // normalize x in "gaussian"
        .map(([x, y]) => [(x - oldMin) / (oldG.width * 2), y])
        .map(([x, y]) => {
          return [x * newRange + newMin, y + y * heightDelta]
        })

      tfEditor.setPoints(points)

      update()
    },

    setRangeZoom: (newRange) => {
      tfEditor.setViewBox(...newRange)
    },
    setDataRange: (newRange) => {
      dataRange = [...newRange]
    },

    getOpacityNodes,
    getOpacityRange: () => getRange(getOpacityNodes(), dataRange),
    setHistogram: noop,
  }
}

export const createTransferFunctionEditor = (context, mount) => {
  const editor = new TransferFunctionEditor(mount)

  return vtkPiecewiseGaussianWidgetFacade(editor, context)
}
