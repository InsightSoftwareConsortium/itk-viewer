import vtkMouseRangeManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseRangeManipulator'

import style from 'itk-viewer-reference-ui/src/ItkVtkViewer.module.css'

import { createTransferFunctionEditor } from './createTransferFunctionEditor'

const createTransferFunctionWidget = (context, imagesUIGroup) => {
  const piecewiseWidgetContainer = document.createElement('div')
  piecewiseWidgetContainer.setAttribute('style', 'height: 150px; width: 400px')
  piecewiseWidgetContainer.setAttribute('class', style.piecewiseWidget)

  const transferFunctionWidgetRow = document.createElement('div')
  transferFunctionWidgetRow.setAttribute('class', style.uiRow)
  // This row needs background different from normal uiRows, to aid
  // in the illusion that it's the content portion of a tabbed pane
  transferFunctionWidgetRow.setAttribute(
    'style',
    'background: rgba(127, 127, 127, 0.5);'
  )
  imagesUIGroup.appendChild(transferFunctionWidgetRow)
  transferFunctionWidgetRow.appendChild(piecewiseWidgetContainer)

  const transferFunctionWidget = createTransferFunctionEditor(
    context,
    piecewiseWidgetContainer
  )

  context.images.transferFunctionWidget = transferFunctionWidget

  // lookupTableProxies used elsewhere in itk-vtk-viewer
  if (typeof context.images.lookupTableProxies === 'undefined') {
    context.images.lookupTableProxies = new Map()
  }

  // Create range manipulator
  const rangeManipulator = vtkMouseRangeManipulator.newInstance({
    button: 1,
    alt: true,
  })
  context.images.transferFunctionManipulator = {
    rangeManipulator: null,
    windowMotionScale: 150.0,
    levelMotionScale: 150.0,
    windowGet: null,
    windowSet: null,
    levelGet: null,
    levelSet: null,
  }
  context.images.transferFunctionManipulator.rangeManipulator = rangeManipulator

  // Window
  const windowGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0]
    return (
      gaussian.width *
      context.images.transferFunctionManipulator.windowMotionScale
    )
  }
  context.images.transferFunctionManipulator.windowGet = windowGet
  const windowSet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians()
    const newGaussians = gaussians.slice()
    newGaussians[0].width =
      value / context.images.transferFunctionManipulator.windowMotionScale
    const name = context.images.selectedName
    const component = context.images.selectedComponent
    context.service.send({
      type: 'IMAGE_PIECEWISE_FUNCTION_GAUSSIANS_CHANGED',
      data: { name, component, gaussians: newGaussians },
    })
  }
  context.images.transferFunctionManipulator.windowSet = windowSet

  // // Level
  const levelGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0]
    return (
      gaussian.position *
      context.images.transferFunctionManipulator.levelMotionScale
    )
  }
  context.images.transferFunctionManipulator.levelGet = levelGet
  const levelSet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians()
    const newGaussians = gaussians.slice()
    const name = context.images.selectedName
    const component = context.images.selectedComponent
    context.service.send({
      type: 'IMAGE_PIECEWISE_FUNCTION_GAUSSIANS_CHANGED',
      data: { name, component, gaussians: newGaussians },
    })
  }
  context.images.transferFunctionManipulator.levelSet = levelSet

  // // Add range manipulator
  context.itkVtkView
    .getInteractorStyle2D()
    .addMouseManipulator(rangeManipulator)
  context.itkVtkView
    .getInteractorStyle3D()
    .addMouseManipulator(rangeManipulator)

  const pwfRangeManipulator = vtkMouseRangeManipulator.newInstance({
    button: 3, // Right mouse
    alt: true,
  })
  const pwfRangeManipulatorShift = vtkMouseRangeManipulator.newInstance({
    button: 1, // Left mouse
    shift: true, // For the macOS folks
    alt: true,
  })

  const pwfMotionScale = 200.0
  const pwfGet = () => {
    const gaussian = transferFunctionWidget.getGaussians()[0]
    return gaussian.height * pwfMotionScale
  }
  const pwfSet = (value) => {
    const gaussians = transferFunctionWidget.getGaussians()
    const newGaussians = gaussians.slice()
    newGaussians[0].height = value / pwfMotionScale
    const name = context.images.selectedName
    const component = context.images.selectedComponent
    context.service.send({
      type: 'IMAGE_PIECEWISE_FUNCTION_GAUSSIANS_CHANGED',
      data: { name, component, gaussians: newGaussians },
    })
  }
  pwfRangeManipulator.setVerticalListener(0, pwfMotionScale, 1, pwfGet, pwfSet)
  pwfRangeManipulatorShift.setVerticalListener(
    0,
    pwfMotionScale,
    1,
    pwfGet,
    pwfSet
  )
  context.itkVtkView
    .getInteractorStyle3D()
    .addMouseManipulator(pwfRangeManipulator)
  context.itkVtkView
    .getInteractorStyle3D()
    .addMouseManipulator(pwfRangeManipulatorShift)
}

export default createTransferFunctionWidget
