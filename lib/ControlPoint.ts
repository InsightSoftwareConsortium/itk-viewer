import { iContainer } from './Container'

const makeCircle = () => {
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  )
  circle.setAttribute('r', '10')
  circle.setAttribute('fill', 'white')
  circle.setAttribute('stroke', 'red')
  circle.setAttribute('stroke-width', '2')
  circle.setAttribute('class', 'controlPoint')

  return circle
}

export class ControlPoint {
  shape: SVGCircleElement
  container: iContainer
  point: number[]

  constructor(container: iContainer, point: number[]) {
    this.shape = makeCircle()
    this.point = point
    this.container = container

    container.addSizeObserver(() => {
      this.positionShape()
    })

    // drag control point around
    this.shape.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => this.movePoint(e)
      document.addEventListener('pointermove', onPointerMove)
      const removeListeners = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', removeListeners)
      }
      document.addEventListener('pointerup', removeListeners)
    })

    container.appendChild(this.shape)
    this.positionShape()
  }

  private positionShape() {
    const { x: sizeX, y: sizeY } = this.container.getSize()
    const [x, y] = this.point
    const xSvg = x * sizeX
    const ySvg = (1 - y) * sizeY

    this.shape.setAttribute('cx', String(xSvg))
    this.shape.setAttribute('cy', String(ySvg))
  }

  movePoint(e: PointerEvent) {
    const [x, y] = this.container.toNormalized(e.clientX, e.clientY)
    this.point[0] = x
    this.point[1] = y

    this.positionShape()
  }
}
