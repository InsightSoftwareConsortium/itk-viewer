import { Container } from './Container'

const makePoints = (svg: SVGSVGElement, points: number[][]) => {
  points.forEach(() => {
    // create a circle
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    )
    circle.setAttribute('cx', '0')
    circle.setAttribute('cy', '20')
    circle.setAttribute('r', '5')
    circle.setAttribute('fill', 'white')
    circle.setAttribute('stroke', 'red')
    circle.setAttribute('stroke-width', '2')

    circle.setAttribute('class', 'controlPoint')
    svg.appendChild(circle)
  })
}

export const TfEditor = (domElement: HTMLElement) => {
  const container = Container(domElement)

  const points = [[0, 0], [1, 1]]
  makePoints(container.svg, points)

  return {
    domElement,
    points
  }
}
