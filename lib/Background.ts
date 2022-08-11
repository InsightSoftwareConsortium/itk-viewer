import { ContainerType } from './Container'
import {
  ColorTransferFunction,
  drawChart,
  updateColorCanvas,
} from './PiecewiseUtils'
import { Points, pointsToWindowedPoints } from './Points'

const HISTOGRAM_COLOR = 'rgba(50, 50, 50, 0.8)'

export const Background = (container: ContainerType, points: Points) => {
  const canvas = document.createElement('canvas')
  container.root.appendChild(canvas)
  canvas.setAttribute('style', 'width: 100%; height: 100%; ')
  const ctx = canvas.getContext('2d')

  let colorTransferFunction: ColorTransferFunction
  let histogram: number[]
  const colorCanvas = document.createElement('canvas')

  const render = () => {
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (colorTransferFunction) {
      const { width, height } = container.root.getBoundingClientRect()
      canvas.setAttribute('width', String(width))
      canvas.setAttribute('height', String(height))
      const { left, right, bottom, top } = container.borderSize()
      const borderWidth = Math.ceil(right - left)
      if (borderWidth < 0) return

      const windowed = pointsToWindowedPoints(points.points)
      const linePoints = [[0, 0], ...windowed, [1, 0]].map(([x, y]) =>
        container.normalizedToSvg(x, y)
      )

      ctx.save() // only apply clip path to color transfer function, leave historgram alone
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
      ctx.restore()
    }

    if (histogram) {
      const { left, right, bottom, top } = container.borderSize()
      const graphArea = [left, top, right - left, bottom - top] as [
        number,
        number,
        number,
        number
      ]
      drawChart(ctx, graphArea, histogram, {
        lineWidth: 1,
        strokeStyle: HISTOGRAM_COLOR,
        fillStyle: HISTOGRAM_COLOR,
      })
    }
  }

  container.addSizeObserver(render)
  points.eventTarget.addEventListener('updated', render)

  const setColorTransferFunction = (ctf: ColorTransferFunction) => {
    colorTransferFunction = ctf
    render()
  }

  const setHistogram = (newHistogram: number[]) => {
    histogram = newHistogram
    render()
  }

  return {
    container,
    canvas,
    setColorTransferFunction,
    setHistogram,
    remove: () => container.root.removeChild(canvas),
  }
}

export type BackgroundType = ReturnType<typeof Background>
