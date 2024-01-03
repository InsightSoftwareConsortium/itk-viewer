import { ContainerType, PADDING } from './Container'
import { DataRange } from './DataRange'

// pixels dom space
const X_OFFSET = PADDING - 3
const Y_OFFSET = -2
const FONT_SIZE = 12

export const AxisLabels = (container: ContainerType, dataRange: DataRange) => {
  const getSvgPosition = (xNormalized: number) => {
    const [xSvg, bottom] = container.normalizedToSvg(xNormalized, 0)
    const ySvg = bottom + Y_OFFSET + FONT_SIZE
    return [xSvg, ySvg]
  }

  const { svg, addSizeObserver } = container

  const createLabel = (anchor: 'start' | 'end') => {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('text-anchor', anchor)
    label.setAttribute('dominant-baseline', 'hanging')
    label.setAttribute('fill', 'black')
    label.setAttribute('font-size', `${FONT_SIZE}px`)
    label.setAttribute('font-family', 'sans-serif')
    label.setAttribute('pointer-events', 'none')
    svg.appendChild(label)
    return label
  }
  const low = createLabel('start')
  const high = createLabel('end')

  const updateLabel = (
    label: SVGTextElement,
    xNormalized: number,
    xOffset: number,
  ) => {
    const value = dataRange.toDataSpace(xNormalized)
    label.textContent = value === 0 ? '0' : `${value.toPrecision(4)}`
    const [x, y] = getSvgPosition(xNormalized)
    label.setAttribute('x', String(x + xOffset))
    label.setAttribute('y', String(y))
  }

  const updateLabels = () => {
    const [lowX, highX] = container.getViewBox()
    updateLabel(low, lowX, -X_OFFSET)
    updateLabel(high, highX, X_OFFSET)
  }

  updateLabels()
  addSizeObserver(updateLabels)
  dataRange.eventTarget.addEventListener('updated', updateLabels)

  const setVisibility = (visibility: boolean) => {
    low.setAttribute('visibility', visibility ? 'visible' : 'hidden')
    high.setAttribute('visibility', visibility ? 'visible' : 'hidden')
  }
  return setVisibility
}
