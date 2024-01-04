import { ContainerType } from './Container'
import { DataRange } from './DataRange'

// pixels dom space
const Y_OFFSET = -2
const FONT_SIZE = 12

export const AxisLabels = (container: ContainerType, dataRange: DataRange) => {
  const getSvgPosition = (xNormalized: number) => {
    const [xSvg, bottom] = container.normalizedToSvg(xNormalized, 0)
    const ySvg = bottom + Y_OFFSET + FONT_SIZE
    return [xSvg, ySvg]
  }

  const { appendChild, addSizeObserver } = container

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

  const updateLabel = (label: SVGTextElement, xNormalized: number) => {
    const value = dataRange.toDataSpace(xNormalized)
    label.textContent = value === 0 ? '0' : `${value.toPrecision(4)}`
    const [x, y] = getSvgPosition(xNormalized)
    label.setAttribute('x', String(x))
    label.setAttribute('y', String(y))
  }

  const updateLabels = () => {
    const [lowX, highX] = container.getViewBox()
    updateLabel(low, lowX)
    updateLabel(high, highX)
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
