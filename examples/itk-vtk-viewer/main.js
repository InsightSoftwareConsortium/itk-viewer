import referenceUIMachineOptions from 'itk-viewer-reference-ui/src/referenceUIMachineOptions.js'
import { throttle } from '@kitware/vtk.js/macros'
import { TransferFunctionEditor } from '../../lib/TransferFunctionEditor'

const PIECEWISE_UPDATE_DELAY = 100

const updateContextPiecewiseFunction =
  (context) =>
  ({ detail: points }) => {
    const name = context.images.selectedName
    const actorContext = context.images.actorContext.get(name)
    const component = actorContext.selectedComponent
    const range = actorContext.colorRanges.get(component)
    const delta = range[1] - range[0]
    const nodes = points.map(({ x, y }, index) => ({
      x: range[0] + delta * x,
      y,
      midpoint: 0.5,
      sharpness: 0,
    }))
    console.log(nodes.map(({ x }) => x))
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

const createEditor = (imagesContext) => {
  const editorHome = document.createElement('div')
  const editor = new TransferFunctionEditor(editorHome)

  const updateViewerPiecewiseFunction = throttle(
    updateContextPiecewiseFunction(imagesContext),
    PIECEWISE_UPDATE_DELAY
  )
  editor.eventTarget.addEventListener('updated', updateViewerPiecewiseFunction)

  return editorHome
}

const customOptions = {
  ...referenceUIMachineOptions,

  images: {
    actions: {
      ...referenceUIMachineOptions.images.actions,

      createImagesInterface: (context) => {
        referenceUIMachineOptions.images.actions.createImagesInterface(context)
        const editor = createEditor(context)
        context.images.imagesUIGroup.appendChild(editor)
      },
    },
  },
}

export default customOptions
