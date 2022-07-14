export type ChartStyle = {
  lineWidth: number
  strokeStyle: string
  fillStyle: string | CanvasGradient | CanvasPattern | undefined
  clip: boolean
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
  }
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
      Math.max(area[1], offset - values[index] * verticalScale)
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
    withAlpha: boolean
  ) => Uint8Array
  getMappingRange: () => [number, number]
}

export const updateColorCanvas = (
  colorTransferFunction: ColorTransferFunction,
  width: number,
  rangeToUse: [number, number],
  canvas: HTMLCanvasElement
) => {
  const workCanvas = canvas || document.createElement('canvas')
  workCanvas.setAttribute('width', String(width))
  workCanvas.setAttribute('height', String(256))

  const rgba = colorTransferFunction.getUint8Table(
    rangeToUse[0],
    rangeToUse[1],
    width,
    true
  )

  const ctx = workCanvas.getContext('2d')
  if (ctx) {
    const pixelsArea = ctx.getImageData(0, 0, width, 256)
    for (let lineIdx = 0; lineIdx < 256; lineIdx++) {
      pixelsArea.data.set(rgba, lineIdx * 4 * width)
    }

    const nbValues = 256 * width * 4
    const lineSize = width * 4
    for (let i = 3; i < nbValues; i += 4) {
      pixelsArea.data[i] = 255 - Math.floor(i / lineSize)
    }

    ctx.putImageData(pixelsArea, 0, 0)
  }

  return workCanvas
}
