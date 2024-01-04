import { ContainerType } from './Container'
import { DataRange } from './DataRange'
import { createOrGates } from './utils'

// pixels dom space
const Y_OFFSET = -2
const FONT_SIZE = 12
const BORDER_STROKE = 21

export const AxisLabels = (container: ContainerType, dataRange: DataRange) => {
  const getSvgPosition = (xNormalized: number) => {
    const [xSvg, bottom] = container.normalizedToSvg(xNormalized, 0)
    const ySvg = bottom + Y_OFFSET + FONT_SIZE
    return [xSvg, ySvg]
  }

  const { appendChild, addSizeObserver, paddedBorder } = container

  const createLabel = (anchor: 'start' | 'end') => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('text-anchor', anchor)
    label.setAttribute('dominant-baseline', 'hanging')
    label.setAttribute('fill', 'black')
    label.setAttribute('font-size', `${FONT_SIZE}px`)
    label.setAttribute('font-family', 'sans-serif')
    label.setAttribute('pointer-events', 'none')
    appendChild(label, 'overlay')
    return label
  }
  const low = createLabel('start')
  const high = createLabel('end')

  const invisibleHoverBorder = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect',
  )
  appendChild(invisibleHoverBorder)
  invisibleHoverBorder.setAttribute('fill', 'none')
  invisibleHoverBorder.setAttribute('stroke', 'none')
  invisibleHoverBorder.setAttribute('stroke-width', String(BORDER_STROKE))
  invisibleHoverBorder.setAttribute('pointer-events', 'stroke')

  const updateLabel = (label: SVGTextElement, xNormalized: number) => {
    const value = dataRange.toDataSpace(xNormalized)
    label.textContent = value === 0 ? '0' : `${value.toPrecision(4)}`
    const [x, y] = getSvgPosition(xNormalized)
    label.setAttribute('x', String(x))
    label.setAttribute('y', String(y))

    // match padded border attrributs to invisible hover border
    ;['x', 'y', 'width', 'height'].forEach((attr) => {
      const value = paddedBorder.getAttribute(attr)
      value !== null && invisibleHoverBorder.setAttribute(attr, value)
    })
  }

  const updateLabels = () => {
    const [lowX, highX] = container.getViewBox()
    updateLabel(low, lowX)
    updateLabel(high, highX)
  }

  updateLabels()
  addSizeObserver(updateLabels)
  dataRange.eventTarget.addEventListener('updated', updateLabels)

  low.style.transition = 'opacity 0.3s ease-in-out'
  high.style.transition = 'opacity 0.3s ease-in-out'
  const setVisibility = (visibility: boolean) => {
    const opacity = visibility ? '1' : '0'
    low.style.opacity = opacity
    high.style.opacity = opacity
  }

  const createSetVisibilityGate = createOrGates(setVisibility)

  const setVisFromBorder = createSetVisibilityGate()
  invisibleHoverBorder.addEventListener('pointerenter', () => {
    setVisFromBorder(true)
  })
  invisibleHoverBorder.addEventListener('pointerleave', () => {
    setVisFromBorder(false)
  })

  return { createSetVisibilityGate }
}
