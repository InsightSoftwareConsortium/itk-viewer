import { extendPoints } from './Points'

export type ChartStyle = {
  lineWidth: number
  strokeStyle: string
  fillStyle?: string | CanvasGradient | CanvasPattern | undefined
  clip?: boolean
}

export const drawChart = (
  ctx: CanvasRenderingContext2D,
  area: [number, number, number, number],
  values: number[],
  style: ChartStyle = {
    lineWidth: 1,
    strokeStyle: '#000',
    fillStyle: undefined,
    clip: false,
  },
) => {
  const verticalScale = area[3]
  const horizontalScale = area[2] / (values.length - 1)
  const offset = verticalScale + area[1]

  ctx.lineWidth = style.lineWidth
  ctx.strokeStyle = style.strokeStyle

  ctx.beginPath()
  ctx.moveTo(area[0], area[1] + area[3])

  for (let index = 0; index < values.length; index++) {
    ctx.lineTo(
      area[0] + index * horizontalScale,
      Math.max(area[1], offset - values[index] * verticalScale),
    )
  }

  if (style.fillStyle) {
    ctx.fillStyle = style.fillStyle
    ctx.lineTo(area[0] + area[2], area[1] + area[3])

    if (style.clip) {
      ctx.clip()
      return
    }

    ctx.fill()
  }
  ctx.stroke()
}

export type ColorTransferFunction = {
  getUint8Table: (
    start: number,
    end: number,
    width: number,
    withAlpha: boolean,
  ) => Uint8Array
  getMappingRange: () => [number, number]
  getSize: () => number
  getColor: (x: number, rgba: Array<number>) => void
}

const CANVAS_HEIGHT = 1

export const updateColorCanvas = (
  colorTransferFunction: ColorTransferFunction,
  width: number,
  renderedDataRange: [number, number],
  canvas: HTMLCanvasElement,
) => {
  const workCanvas = canvas || document.createElement('canvas')
  workCanvas.setAttribute('width', String(width))
  workCanvas.setAttribute('height', String(CANVAS_HEIGHT))

  if (colorTransferFunction.getSize() === 0) return workCanvas

  const rgba = colorTransferFunction.getUint8Table(
    renderedDataRange[0],
    renderedDataRange[1],
    width,
    true,
  )

  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
  if (ctx) {
    const pixelsArea = ctx.getImageData(0, 0, width, CANVAS_HEIGHT)
    for (let lineIdx = 0; lineIdx < CANVAS_HEIGHT; lineIdx++) {
      pixelsArea.data.set(rgba, lineIdx * 4 * width)
    }

    const nbValues = CANVAS_HEIGHT * width * 4
    // const lineSize = width * 4
    for (let i = 3; i < nbValues; i += 4) {
      pixelsArea.data[i] = 255 // keep full opacity at bottom rather than: 255 - Math.floor(i / lineSize)
    }

    ctx.putImageData(pixelsArea, 0, 0)
  }

  return workCanvas
}

export const windowPointsForSort = (points: [number, number][]) => {
  const windowedPoints = extendPoints(points)
  // avoid unstable Array.sort issues
  windowedPoints[0][0] -= 1e-8
  windowedPoints[windowedPoints.length - 1][0] += 1e-8
  return windowedPoints
}

export const logTransform = (histogram?: number[]): number[] => {
  if (!histogram) return []
  const loged = histogram.map((v) => (v === 0 ? 0 : Math.log(v)))
  const noZeros = loged.filter(Boolean)
  const min = Math.min(...noZeros)
  const max = Math.max(...noZeros)
  const delta = max - min
  const normalized = loged.map((v) => (v === 0 ? 0 : (v - min) / delta))
  return normalized
}

export function arrayEquals<T>(a: Array<T>, b: Array<T>) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function rgbaToHexa(rgba: Array<number>) {
  const hexa = rgba
    .map((c) => Math.floor(c * 255))
    .map((comp) => `0${comp.toString(16)}`.slice(-2))
  return `#${hexa.join('')}`
}

// Returns vtk.js piecewise function nodes
// rescaled into data range space.
export const getNodes = (range: number[], points: Array<[number, number]>) => {
  const findY1Intercepts = (points: Array<[number, number]>): number[] => {
    const xPositions: number[] = []

    for (let i = 0; i < points.length - 1; i++) {
      const point1 = points[i]
      const point2 = points[i + 1]

      // Check if the line between point1 and point2 intersects y=1
      if (
        (point1[1] <= 1 && point2[1] >= 1) ||
        (point1[1] >= 1 && point2[1] <= 1)
      ) {
        // Calculate the x position of the intersection point using linear interpolation
        const x =
          point1[0] +
          ((1 - point1[1]) / (point2[1] - point1[1])) * (point2[0] - point1[0])
        xPositions.push(x)
      }
    }

    return xPositions
  }
  const xPositions = findY1Intercepts(points)
  const withIntercepts = [...points, ...xPositions.map((x) => [x, 1])]

  const windowedPoints = windowPointsForSort(
    withIntercepts as Array<[number, number]>,
  )

  const delta = range[1] - range[0]
  return windowedPoints.map(([x, y]) => ({
    x: range[0] + delta * x,
    y: Math.min(y, 1), // vtk.js volume voxels get 0 opacity if y > 1
    midpoint: 0.5,
    sharpness: 0,
  }))
}
