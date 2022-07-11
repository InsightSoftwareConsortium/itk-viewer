export const PADDING = 10

const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', 'tf-editor-container')
  svg.setAttribute('style', 'box-sizing: border-box; width: 100%; height: 100%')
  return svg
}

type SvgInHtml = HTMLElement & SVGSVGElement

export const Container = (mount: HTMLElement) => {
  const svg = makeSvg()
  mount.appendChild(svg)

  const paddedBorder = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  )
  svg.appendChild(paddedBorder)
  paddedBorder.setAttribute('x', `${PADDING}`)
  paddedBorder.setAttribute('y', `${PADDING}`)
  paddedBorder.setAttribute('fill', 'none')
  paddedBorder.setAttribute('stroke', 'black')

  const appendChild = (shape: SVGGraphicsElement) => {
    svg.appendChild(shape)
  }

  const sizeEmitter = new EventTarget()
  const addSizeObserver = (cb: () => void) => {
    const { width, height } = getSize()
    paddedBorder.setAttribute('width', `${Math.max(0, width)}`)
    paddedBorder.setAttribute('height', `${Math.max(0, height)}`)
    sizeEmitter.addEventListener('sizeupdated', cb)
  }

  const resizeObserver = new ResizeObserver(() => {
    sizeEmitter.dispatchEvent(new Event('sizeupdated'))
  })
  resizeObserver.observe(mount)

  const getSize = () => {
    const { top, left, width, height } = svg.getBoundingClientRect()
    return {
      width: width - 2 * PADDING,
      height: height - 2 * PADDING,
      top: top + PADDING,
      left: left + PADDING,
    }
  }

  const toNormalized = (x: number, y: number) => {
    const { top, left, width, height } = getSize()
    return [(x - left) / width, 1 - (y - top) / height]
  }

  const toDOMPosition = (x: number, y: number) => {
    const { width, height } = getSize()
    const xSvg = x * width + PADDING
    const ySvg = (1 - y) * height + PADDING
    return [xSvg, ySvg]
  }

  const remove = () => mount.removeChild(svg)

  return {
    appendChild,
    addSizeObserver,
    getSize,
    domElement: svg as SvgInHtml,
    toNormalized,
    toDOMPosition,
    remove,
  }
}

export type ContainerType = ReturnType<typeof Container>
