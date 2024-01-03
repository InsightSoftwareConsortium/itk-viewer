import { ColorRangeType } from './ColorRange'
import { ContainerType } from './Container'
import {
  ColorTransferFunction,
  drawChart,
  updateColorCanvas,
} from './PiecewiseUtils'
import { Points, pointsToWindowedPoints } from './Points'

const HISTOGRAM_COLOR = 'rgba(50, 50, 50, 0.3)'

export const Background = (
  container: ContainerType,
  points: Points,
  colorRange: ColorRangeType,
) => {
  const canvas = document.createElement('canvas')
  container.root.appendChild(canvas)
  canvas.setAttribute('style', 'width: 100%; height: 100%; ')
  const ctx = canvas.getContext('2d')

  let colorTransferFunction: ColorTransferFunction
  let histogram: number[]
  const colorCanvas = document.createElement('canvas')

  const draw = () => {
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
      const [colorStart, colorEnd] = colorRange.getColorRange()
      const [headX] = container.normalizedToSvg(colorStart, 1)
      const [tailX] = container.normalizedToSvg(colorEnd, 1)
      // ensure 2 pixel width color canvas to sample high and low color
      const headXClamped = Math.min(width, Math.max(0, headX))
      const tailXClampedRaw = Math.min(width, Math.max(0, tailX))
      // ensure 2 pixel width color canvas to sample high and low color
      const tailXClamped =
        tailXClampedRaw - headXClamped < 2 ? headXClamped + 2 : tailXClampedRaw
      const colorCanvasWidth = Math.ceil(tailXClamped - headXClamped)

      if (colorTransferFunction) {
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
        // fill left edge to head with first color
        const savedSmoothing = ctx.imageSmoothingEnabled
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          colorCanvas,
          0,
          0,
          1,
          1,
          0,
          Math.floor(top),
          Math.floor(headXClamped),
          Math.ceil(bottom - top),
        )
        // fill tail to right edge with last color
        ctx.drawImage(
          colorCanvas,
          colorCanvas.width - 1,
          0,
          1,
          1,
          Math.floor(tailXClamped),
          Math.floor(top),
          width - tailXClamped,
          Math.ceil(bottom - top),
        )
        ctx.imageSmoothingEnabled = savedSmoothing
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

  // debounce render to draw background once, even if multiple points are updated in one event callback
  let debounceTimeout: ReturnType<typeof setTimeout>
  const render = () => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      draw()
    }, 0)
  }

  container.addSizeObserver(render)
  points.eventTarget.addEventListener('updated', render)
  colorRange.eventTarget.addEventListener('updated', render)

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
