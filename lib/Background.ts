import { ContainerType } from './Container'
import {
  ColorTransferFunction,
  drawChart,
  updateColorCanvas,
} from './PiecewiseUtils'
import { Points, pointsToWindowedPoints } from './Points'

const HISTOGRAM_COLOR = 'rgba(50, 50, 50, 0.3)'

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
        container.normalizedToSvg(x, y),
      )

      ctx.save() // only apply clip path to color transfer function, leave historgram alone
      ctx.beginPath()
      linePoints.forEach(([x, y]) => {
        ctx.lineTo(x, y)
      })
      ctx.clip()

      // width in pixels between head and tail, bounded by SVG size
      const [headX] = linePoints[1]
      const [tailX] = linePoints[linePoints.length - 2]
      const headXClamped = Math.min(width, Math.max(0, headX))
      const tailXClamped = Math.min(width, Math.max(0, tailX))
      const colorCanvasWidth = Math.ceil(tailXClamped - headXClamped)

      // color area not visible if 0 width
      if (colorCanvasWidth) {
        // Compute visible data range
        const pointPixelWidth = tailX - headX
        const headClampAmount = (headXClamped - headX) / pointPixelWidth
        const tailClampAmount = (tailXClamped - tailX) / pointPixelWidth
        const dataRange = colorTransferFunction.getMappingRange()
        const dataWidth = dataRange[1] - dataRange[0]
        const visibleDataRange = [
          dataRange[0] + dataWidth * headClampAmount,
          dataRange[1] + dataWidth * tailClampAmount,
        ] as [number, number]

        updateColorCanvas(
          colorTransferFunction,
          colorCanvasWidth,
          visibleDataRange,
          colorCanvas,
        )

        ctx.drawImage(
          colorCanvas,
          0,
          0,
          colorCanvas.width,
          colorCanvas.height,
          Math.floor(headXClamped),
          Math.floor(top),
          colorCanvasWidth,
          Math.ceil(bottom - top),
        )
      }
      ctx.restore()
    }

    if (histogram) {
      const { left, right, bottom, top } = container.borderSize()
      const graphArea = [left, top, right - left, bottom - top] as [
        number,
        number,
        number,
        number,
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
    render,
    remove: () => container.root.removeChild(canvas),
  }
}

export type BackgroundType = ReturnType<typeof Background>
