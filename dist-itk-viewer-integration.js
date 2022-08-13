import fs from 'fs'

fs.copyFileSync(
  './examples/itk-vtk-viewer/createTransferFunctionWidget.js',
  './dist/createTransferFunctionWidget.js'
)
fs.copyFileSync(
  './examples/itk-vtk-viewer/createTransferFunctionEditor.js',
  './dist/createTransferFunctionEditor.js'
)
