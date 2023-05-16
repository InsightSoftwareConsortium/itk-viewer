import { arrayEquals } from './PiecewiseUtils'

export const PADDING = 10

const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute(
    'style',
    'position: absolute; top: 0; left: 0; z-index: 2; box-sizing: border-box; width: 100%; height: 100%;'
  )
  return svg
}

export const Container = (parent: HTMLElement) => {
  const root = document.createElement('div')
  root.setAttribute('style', 'position: relative; width: 100%; height: 100%')
  parent.appendChild(root)

  const svg = makeSvg()
  root.appendChild(svg)

  const sizeEmitter = new EventTarget()
  const addSizeObserver = (cb: () => void) => {
    sizeEmitter.addEventListener('sizeupdated', cb)
  }

  const resizeObserver = new ResizeObserver(() => {
    sizeEmitter.dispatchEvent(new Event('sizeupdated'))
  })
  resizeObserver.observe(root)

  const paddedBorder = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  )
  svg.appendChild(paddedBorder)
  paddedBorder.setAttribute('fill', 'none')
  paddedBorder.setAttribute('stroke', 'black')

  const appendChild = (shape: SVGGraphicsElement) => {
    svg.appendChild(shape)
  }

  const removeChild = (shape: SVGGraphicsElement) => {
    svg.removeChild(shape)
  }

  // xmin, xmax, ymin, ymax
  let viewBox = [0, 1.0, 0, 1.0]

  const getViewBox = () => viewBox

  const setViewBox = (
    valueStart: number,
    valueEnd: number,
    opacityMin = 0,
    opacityMax = 1
  ) => {
    const oldViewBox = viewBox
    viewBox = [valueStart, valueEnd, opacityMin, opacityMax]
    if (!arrayEquals(oldViewBox, viewBox)) {
      sizeEmitter.dispatchEvent(new Event('sizeupdated'))
    }
  }

  const getSize = () => {
    const { top, left, width, height } = root.getBoundingClientRect()
    return {
      width: width - 2 * PADDING,
      height: height - 2 * PADDING,
      top: top + PADDING,
      left: left + PADDING,
    }
  }

  const domToNormalized = (x: number, y: number) => {
    const { top, left, width, height } = getSize()
    const valueRange = viewBox[1] - viewBox[0] || 0.001
    const opacityRange = viewBox[3] - viewBox[2] || 0.001
    return [
      ((x - left) / width) * valueRange + viewBox[0],
      (1 - (y - top) / height) * opacityRange + viewBox[2],
    ]
  }

  const normalizedToSvg = (x: number, y: number) => {
    const { width, height } = getSize()
    const valueRange = viewBox[1] - viewBox[0] || 0.001
    const xSvg = ((x - viewBox[0]) / valueRange) * width + PADDING
    const opacityRange = viewBox[3] - viewBox[2] || 0.001
    const ySvg = (1 - (y - viewBox[2]) / opacityRange) * height + PADDING
    return [xSvg, ySvg]
  }

  const borderSize = () => {
    const [left, bottom] = normalizedToSvg(0, 0)
    const [right, top] = normalizedToSvg(1, 1)
    return { left, bottom, right, top }
  }

  const updateBorder = () => {
    const { left, bottom, right, top } = borderSize()
    paddedBorder.setAttribute('x', `${left}`)
    paddedBorder.setAttribute('y', `${top}`)
    paddedBorder.setAttribute('width', `${Math.max(0, right - left)}`)
    paddedBorder.setAttribute('height', `${Math.max(0, bottom - top)}`)
  }
  addSizeObserver(updateBorder)

  const remove = () => parent.removeChild(root)

  return {
    appendChild,
    removeChild,
    addSizeObserver,
    getViewBox,
    setViewBox,
    domToNormalized,
    normalizedToSvg,
    borderSize,
    remove,
    root,
  }
}

export type ContainerType = ReturnType<typeof Container>
