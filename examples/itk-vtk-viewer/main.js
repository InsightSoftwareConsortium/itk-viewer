import uiMachineOptions from './createUiMachineOptions'

const bootViewer = () => {
  const container = document.querySelector('.content')

  const image = new URL(
    'https://data.kitware.com/api/v1/file/5b843d468d777f43cc8d4f6b/download/engine.nrrd',
  )
  // eslint-disable-next-line no-undef
  itkVtkViewer.createViewer(container, {
    image,
    rotate: false,
    config: { uiMachineOptions },
  })
}

bootViewer()
