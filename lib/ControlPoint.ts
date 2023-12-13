import { ContainerType } from './Container'
import { Point } from './Point'

export const CONTROL_POINT_CLASS = 'controlPoint'

const makeCircle = () => {
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  circle.setAttribute('r', '9')
  circle.setAttribute('fill', 'white')
  circle.setAttribute('stroke', 'black')
  circle.setAttribute('stroke-width', '2')
  circle.setAttribute('class', CONTROL_POINT_CLASS)
  circle.setAttribute('style', 'cursor: move;')

  return circle
}

export class ControlPoint {
  element: SVGCircleElement
  private container: ContainerType
  private isDragging: boolean = false
  private isHovered: boolean = false
  readonly point: Point

  readonly DELETE_EVENT = 'deleteme'
  readonly eventTarget = new EventTarget()

  constructor(
    container: ContainerType,
    point: Point,
    deleteEventCallback?: (event: CustomEvent) => void,
    isNewPointFromPointer = false,
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
    if (isNewPointFromPointer) this.startInteraction(true)
  }

  remove() {
    this.container.removeChild(this.element)
  }

  private positionElement() {
    const { x, y } = this.point
    const [xSvg, ySvg] = this.container.normalizedToSvg(x, y)
    this.element.setAttribute('cx', String(xSvg))
    this.element.setAttribute('cy', String(ySvg))
  }

  movePoint(e: PointerEvent) {
    const [x, y] = this.container.domToNormalized(e.clientX, e.clientY)
    this.point.setPosition(x, y)
    this.positionElement()
  }

  startInteraction(forceDragging = false) {
    this.isDragging = forceDragging
    if (!this.isDragging) {
      this.element.setAttribute('stroke', 'red') // deleteable
    }
    const onPointerMove = (e: PointerEvent) => {
      this.isDragging = true
      this.element.setAttribute('stroke', 'black')
      this.movePoint(e)
    }
    document.addEventListener('pointermove', onPointerMove)

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      if (!this.isDragging) {
        const delEvent = new CustomEvent(this.DELETE_EVENT, { detail: this })
        this.eventTarget.dispatchEvent(delEvent)
      }
      if (!this.isHovered) this.element.setAttribute('stroke-width', '2')
      this.isDragging = false
    }

    document.addEventListener('pointerup', onPointerUp)
  }

  setupInteraction() {
    this.element.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      this.startInteraction()
    })
    this.element.addEventListener('pointerenter', () => {
      this.isHovered = true
      this.element.setAttribute('stroke-width', '4')
    })
    this.element.addEventListener('pointerleave', () => {
      this.isHovered = false
      if (!this.isDragging) {
        this.element.setAttribute('stroke-width', '2')
      }
    })
  }
}
