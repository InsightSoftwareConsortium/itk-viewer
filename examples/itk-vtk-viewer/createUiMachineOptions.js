import referenceUIMachineOptions from 'itk-vtk-viewer/src/UI/reference-ui/src/referenceUIMachineOptions.js'

import style from 'itk-vtk-viewer/src/UI/reference-ui/src/ItkVtkViewer.module.css'
import applyGroupVisibility from 'itk-vtk-viewer/src/UI/reference-ui/src/applyGroupVisibility'

import createComponentSelector from 'itk-vtk-viewer/src/UI/reference-ui/src/Images/createComponentSelector'
import createColorRangeInput from 'itk-vtk-viewer/src/UI/reference-ui/src/Images/createColorRangeInput'
import createVolumeRenderingInputs from 'itk-vtk-viewer/src/UI/reference-ui/src/Images/createVolumeRenderingInputs'

import createLabelImageColorWidget from 'itk-vtk-viewer/src/UI/reference-ui/src/Images/createLabelImageColorWidget'
import createLabelImageWeightWidget from 'itk-vtk-viewer/src/UI/reference-ui/src/Images/createLabelImageWeightWidget'

import createTransferFunctionWidget from './createTransferFunctionWidget'

function createImagesInterface(context) {
  const imagesUIGroup = document.createElement('div')
  imagesUIGroup.setAttribute('class', style.uiGroup)
  context.images.imagesUIGroup = imagesUIGroup
  context.uiGroups.set('images', imagesUIGroup)

  const componentAndScale = document.createElement('div')
  imagesUIGroup.appendChild(componentAndScale)
  componentAndScale.setAttribute('style', 'display: flex;')
  context.images.componentAndScale = componentAndScale

  createComponentSelector(context, componentAndScale)
  createColorRangeInput(context, imagesUIGroup)
  createTransferFunctionWidget(context, imagesUIGroup)
  createVolumeRenderingInputs(context, imagesUIGroup)

  context.uiContainer.appendChild(imagesUIGroup)

  createLabelImageColorWidget(context)
  createLabelImageWeightWidget(context)

  applyGroupVisibility(
    context,
    ['images', 'labelImages', 'labelImageWeights'],
    false,
  )
}

const customOptions = {
  ...referenceUIMachineOptions,

  images: {
    ...referenceUIMachineOptions.images,
    actions: {
      ...referenceUIMachineOptions.images.actions,
      createImagesInterface,
    },
  },
}

export default customOptions
