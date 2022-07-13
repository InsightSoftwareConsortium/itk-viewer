import { ContainerType } from './Container'
import { Points } from './Points'

const createLine = () => {
  const line = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polyline'
  )
  line.setAttribute('fill', 'none')
  line.setAttribute('stroke', 'black')
  line.setAttribute('stroke-width', '2')
  return line
}

export class Line {
  private readonly points: Points
  private container: ContainerType
  private onPointsUpdated: () => void
  element: SVGPolylineElement

  constructor(container: ContainerType, points: Points) {
    this.container = container
    this.points = points

    this.element = createLine()
    this.container.appendChild(this.element)

    this.onPointsUpdated = () => this.update()
    this.points.eventTarget.addEventListener('updated', this.onPointsUpdated)

    this.container.addSizeObserver(() => {
      this.update()
    })
    this.update()
  }

  remove() {
    this.points.eventTarget.removeEventListener('updated', this.onPointsUpdated)
  }

  update() {
    if (this.points.points.length === 0) {
      this.element.setAttribute('points', '')
      return
    }

    const sortedPoints = this.points.points.sort((a, b) => a.x - b.x)
    const head = sortedPoints[0]
    const tail = sortedPoints[sortedPoints.length - 1]
    // horizontal line to edges of container
    const points = [{ x: 0, y: head.y }, ...sortedPoints, { x: 1, y: tail.y }]
    const stringPoints = points
      .sort((a, b) => a.x - b.x)
      .map(({ x, y }) => this.container.normalizedToSvg(x, y))
      .map(([x, y]) => `${x},${y}`)
      .join(' ')

    this.element.setAttribute('points', stringPoints)
  }
}
