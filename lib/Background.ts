import { ContainerType } from './Container'
import { ColorTransferFunction, updateColorCanvas } from './PiecewiseUtils'
import { Points } from './Points'

export const Background = (container: ContainerType, points: Points) => {
  const canvas = document.createElement('canvas')
  container.root.appendChild(canvas)
  canvas.setAttribute('style', 'width: 100%; height: 100%; ')

  const ctx = canvas.getContext('2d')

  let colorTransferFunction: ColorTransferFunction
  const colorCanvas = document.createElement('canvas')

  const render = () => {
    if (ctx && colorTransferFunction) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { width, height } = container.root.getBoundingClientRect()
      canvas.setAttribute('width', String(width))
      canvas.setAttribute('height', String(height))
      const { left, right, bottom, top } = container.borderSize()
      const borderWidth = Math.ceil(right - left)
      if (borderWidth < 0) return

      const { points: pArray } = points
      if (pArray.length === 0) return
      ctx.save()
      ctx.beginPath()
      const head = pArray[0]
      const tail = pArray[pArray.length - 1]
      // horizontal line to edges and bottom of border
      const linePoints = [
        { x: 0, y: 0 },
        { x: 0, y: head.y },
        ...pArray,
        { x: 1, y: tail.y },
        { x: 1, y: 0 },
      ]
      linePoints
        .map(({ x, y }) => container.normalizedToSvg(x, y))
        .forEach(([x, y]) => {
          ctx.lineTo(x, y)
        })
      ctx.clip()

      updateColorCanvas(
        colorTransferFunction,
        borderWidth,
        colorTransferFunction.getMappingRange(),
        colorCanvas
      )

      ctx.drawImage(
        colorCanvas,
        0,
        0,
        colorCanvas.width,
        colorCanvas.height,
        Math.floor(left),
        Math.floor(top),
        borderWidth,
        Math.ceil(bottom - top)
      )
    }
  }
  container.addSizeObserver(render)
  points.eventTarget.addEventListener('updated', render)

  const setColorTransferFunction = (ctf: ColorTransferFunction) => {
    colorTransferFunction = ctf
    render()
  }

  return {
    container,
    canvas,
    setColorTransferFunction,
    remove: () => container.root.removeChild(canvas),
  }
}

export type BackgroundType = ReturnType<typeof Background>
