const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', 'tf-editor-container')
  svg.setAttribute('style', 'box-sizing: border-box; width: 100%; height: 100%')
  return svg
}

type SvgInHtml = HTMLElement & SVGSVGElement

export interface iContainer {
  appendChild: (element: SVGGraphicsElement) => void
  toNormalized: (x: number, y: number) => number[]
  addSizeObserver: (func: () => void) => void
  getSize: () => DOMRectReadOnly
  domElement: SvgInHtml
  remove: () => void
}

export const Container = (mount: HTMLElement): iContainer => {
  const svg = makeSvg()
  mount.appendChild(svg)

  const appendChild = (shape: SVGGraphicsElement) => {
    svg.appendChild(shape)
  }

  const toNormalized = (x: number, y: number) => {
    const { top, left, width, height } = svg.getBoundingClientRect()
    return [(x - left) / width, 1 - (y - top) / height]
  }

  const sizeEmitter = new EventTarget()
  const addSizeObserver = (cb: () => void) => {
    sizeEmitter.addEventListener('sizeupdated', cb)
  }

  const resizeObserver = new ResizeObserver(() => {
    sizeEmitter.dispatchEvent(new Event('sizeupdated'))
  })
  resizeObserver.observe(mount)

  const getSize = () => svg.getBoundingClientRect()

  const remove = () => mount.removeChild(svg)

  return {
    appendChild,
    toNormalized,
    addSizeObserver,
    getSize,
    domElement: svg as SvgInHtml,
    remove,
  }
}
