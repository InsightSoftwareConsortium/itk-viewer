import { ContainerType } from './Container'
import { ColorTransferFunction, updateColorCanvas } from './PiecewiseUtils'
import { Points, pointToWindowedPoints } from './Points'

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

      const windowed = pointToWindowedPoints(points.points)
      const linePoints = [[0, 0], ...windowed, [1, 0]].map(([x, y]) =>
        container.normalizedToSvg(x, y)
      )

      ctx.beginPath()
      linePoints.forEach(([x, y]) => {
        ctx.lineTo(x, y)
      })
      ctx.clip()

      // pixels between head and tail
      const [tailX] = linePoints[linePoints.length - 2]
      const [headX] = linePoints[1]
      const pointsRange = Math.floor(tailX - headX) || borderWidth
      updateColorCanvas(colorTransferFunction, pointsRange, colorCanvas)

      ctx.drawImage(
        colorCanvas,
        0,
        0,
        colorCanvas.width,
        colorCanvas.height,
        Math.floor(headX),
        Math.floor(top),
        pointsRange,
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
