let stylesSetup = false

const setupTooltipStyles = () => {
  if (stylesSetup) return
  stylesSetup = true
  const style = document.createElement('style')
  style.innerHTML = `
      .tfeditor-svg-tooltip {
        color: black;
        background-color: rgba(255, 255, 255, 0.95);
        position: absolute;
        transform: translate(178px, 410.19px);
        border-style: solid;
        border-color: black;
        border-width: 1px;
        border-radius: 2px;
        font-size: 12px;
        padding: 8px;
        visibility: hidden;
        max-width: 150px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    `
  document.head.appendChild(style)
}

// modified from https://observablehq.com/@siliconjazz/basic-svg-tooltip
export function addTooltip(svgElement: SVGGraphicsElement) {
  setupTooltipStyles()
  const mouseOffset = [10, 10]

  const foreignObject = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'foreignObject',
  )
  foreignObject.setAttribute('width', '100%')
  foreignObject.setAttribute('height', '100%')
  foreignObject.setAttribute('pointer-events', 'none')

  const tooltip = document.createElementNS(
    'http://www.w3.org/1999/xhtml',
    'div',
  )
  tooltip.setAttribute('class', 'tfeditor-svg-tooltip')
  foreignObject.appendChild(tooltip)
  svgElement.append(foreignObject)

  function update(text: string, x: number, y: number) {
    let posX = x + mouseOffset[0]
    let posY = y + mouseOffset[1]

    tooltip.innerHTML = text
    const svgBox = svgElement.getBBox()
    const tooltipBox = tooltip.getBoundingClientRect()

    // if text goes off the SVG edge, move up and/or left
    if (posX > svgBox.width - tooltipBox.width) {
      posX = x - tooltipBox.width - mouseOffset[0]
    }
    if (posY > svgBox.height - tooltipBox.height) {
      posY = y - tooltipBox.height - mouseOffset[1]
    }

    tooltip.style.transform = `translate(${posX}px,${posY}px)`
  }

  function show() {
    tooltip.style.visibility = 'visible'
  }

  function hide() {
    tooltip.style.visibility = 'hidden'
  }

  const remove = () => {
    svgElement.removeChild(foreignObject)
  }

  return { update, show, hide, remove }
}
