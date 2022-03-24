const makeSvg = () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'boxSizing: border-box; border: 3px solid black; width: 100%; height: 100%')
  return svg
}

export const Container = (domElement: HTMLElement) => {
  const svg = makeSvg()
  domElement.appendChild(svg)

  return { svg }
}
