
const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'box-sizing: border-box; width: 100%; height: 100%')
  return svg
}

const getSize = (svg: SVGSVGElement) => {
  const { bottom, top, left, right } = svg.getBoundingClientRect()
  return { x: right - left, y: bottom - top }
}

export interface iContainer {
  add: (element: SVGGraphicsElement, point: number[]) => void
  toNormalized: (x: number, y: number) => number[]
  positionShape: (shape: SVGGraphicsElement, point: number[]) => void
}

export const Container = (mount: HTMLElement) => {
  const svg = makeSvg()
  mount.appendChild(svg)

  const positionShape = (shape: SVGGraphicsElement, point: number[]) => {
    const { x: sizeX, y: sizeY } = getSize(svg)
    const [x, y] = point
    const xSvg = x * sizeX
    const ySvg = (1 - y) * sizeY

    shape.setAttribute('cx', String(xSvg))
    shape.setAttribute('cy', String(ySvg))
  }

  const add = (shape: SVGGraphicsElement, point: number[]) => {
    svg.appendChild(shape)
    positionShape(shape, point)
  }

  const toNormalized = (x: number, y: number) => {
    const { top, left } = svg.getBoundingClientRect()
    const { x: sizeX, y: sizeY } = getSize(svg)
    return [
      (x - left) / sizeX,
      1 - (y - top) / sizeY
    ]
  }

  return { add, positionShape, toNormalized }
}
