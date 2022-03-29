import { iContainer } from './Container'
import { Point } from './Point'

export const CONTROL_POINT_CLASS = 'controlPoint'

const makeCircle = () => {
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  )
  circle.setAttribute('r', '10')
  circle.setAttribute('fill', 'white')
  circle.setAttribute('stroke', 'red')
  circle.setAttribute('stroke-width', '2')
  circle.setAttribute('class', CONTROL_POINT_CLASS)

  return circle
}

export class ControlPoint {
  element: SVGCircleElement
  private container: iContainer
  readonly point: Point

  readonly DELETE_EVENT = 'deleteme'
  readonly eventTarget = new EventTarget()

  constructor(
    container: iContainer,
    point: Point,
    deleteEventCallback?: (event: CustomEvent) => void
  ) {
    this.element = makeCircle()
    this.point = point
    this.container = container

    container.addSizeObserver(() => {
      this.positionElement()
    })

    if (deleteEventCallback) {
      this.eventTarget.addEventListener(this.DELETE_EVENT, (e: Event) => {
        deleteEventCallback(<CustomEvent>e)
      })
    }

    container.appendChild(this.element)
    this.positionElement()

    this.setupInteraction()
  }

  remove() {
    this.container.domElement.removeChild(this.element)
  }

  private positionElement() {
    const { width: sizeX, height: sizeY } = this.container.getSize()
    const { x, y } = this.point
    const xSvg = x * sizeX
    const ySvg = (1 - y) * sizeY

    this.element.setAttribute('cx', String(xSvg))
    this.element.setAttribute('cy', String(ySvg))
  }

  movePoint(e: PointerEvent) {
    const [x, y] = this.container.toNormalized(e.clientX, e.clientY)
    this.point.setPosition(x, y)
    this.positionElement()
  }

  setupInteraction() {
    this.element.addEventListener('pointerdown', (event) => {
      event.stopPropagation()

      let isDragging = false
      const onPointerMove = (e: PointerEvent) => {
        isDragging = true
        this.movePoint(e)
      }
      document.addEventListener('pointermove', onPointerMove)

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)

        if (!isDragging) {
          const delEvent = new CustomEvent(this.DELETE_EVENT, { detail: this })
          this.eventTarget.dispatchEvent(delEvent)
        }
      }

      document.addEventListener('pointerup', onPointerUp)
    })
  }
}
