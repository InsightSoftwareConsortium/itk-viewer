const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'box-sizing: border-box; width: 100%; height: 100%')
  return svg
}

interface Size {
  x: number
  y: number
}

const computeSize = (svg: SVGSVGElement): Size => {
  const { bottom, top, left, right } = svg.getBoundingClientRect()
  return { x: right - left, y: bottom - top }
}

type SvgInHtml = HTMLElement & SVGSVGElement

export interface iContainer {
  add: (element: SVGGraphicsElement) => void
  toNormalized: (x: number, y: number) => number[]
  addSizeObserver: (func: () => void) => void
  getSize: () => Size
  domElement: SvgInHtml
}

export const Container = (mount: HTMLElement): iContainer => {
  const svg = makeSvg()
  mount.appendChild(svg)

  const add = (shape: SVGGraphicsElement) => {
    svg.appendChild(shape)
  }

  const toNormalized = (x: number, y: number) => {
    const { top, left } = svg.getBoundingClientRect()
    const { x: sizeX, y: sizeY } = computeSize(svg)
    return [(x - left) / sizeX, 1 - (y - top) / sizeY]
  }

  const sizeEmitter = new EventTarget()
  const addSizeObserver = (cb: () => void) => {
    sizeEmitter.addEventListener('sizeupdated', cb)
  }

  const resizeObserver = new ResizeObserver(() => {
    sizeEmitter.dispatchEvent(new Event('sizeupdated'))
  })
  resizeObserver.observe(mount)

  const getSize = () => computeSize(svg)

  return {
    add,
    toNormalized,
    addSizeObserver,
    getSize,
    domElement: svg as SvgInHtml,
  }
}
