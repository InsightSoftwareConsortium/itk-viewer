import referenceUIMachineOptions from 'itk-viewer-reference-ui/src/referenceUIMachineOptions.js'

import style from 'itk-viewer-reference-ui/src/ItkVtkViewer.module.css'
import applyGroupVisibility from 'itk-viewer-reference-ui/src/applyGroupVisibility'

import createComponentSelector from 'itk-viewer-reference-ui/src/Images/createComponentSelector'
import createColorRangeInput from 'itk-viewer-reference-ui/src/Images/createColorRangeInput'
import createVolumeRenderingInputs from 'itk-viewer-reference-ui/src/Images/createVolumeRenderingInputs'

import createLabelImageColorWidget from 'itk-viewer-reference-ui/src/Images/createLabelImageColorWidget'
import createLabelImageWeightWidget from 'itk-viewer-reference-ui/src/Images/createLabelImageWeightWidget'

import createTransferFunctionWidget from './createTransferFunctionWidget'

function createImagesInterface(context) {
  const imagesUIGroup = document.createElement('div')
  imagesUIGroup.setAttribute('class', style.uiGroup)
  context.images.imagesUIGroup = imagesUIGroup
  context.uiGroups.set('images', imagesUIGroup)

  createComponentSelector(context, imagesUIGroup)
  createColorRangeInput(context, imagesUIGroup)

  createTransferFunctionWidget(context, imagesUIGroup) // Loads our Editor Widget

  createVolumeRenderingInputs(context, imagesUIGroup)

  context.uiContainer.appendChild(imagesUIGroup)

  createLabelImageColorWidget(context)
  createLabelImageWeightWidget(context)

  applyGroupVisibility(
    context,
    ['images', 'labelImages', 'labelImageWeights'],
    false
  )
}

const customOptions = {
  ...referenceUIMachineOptions,

  images: {
    actions: {
      ...referenceUIMachineOptions.images.actions,
      createImagesInterface,
    },
  },
}

export default customOptions
