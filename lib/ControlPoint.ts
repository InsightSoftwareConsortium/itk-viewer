import { ContainerType } from './Container'
import { Point } from './Point'
import { addTooltip } from './addTooltip'

export const CONTROL_POINT_CLASS = 'controlPoint'

const clamp0to1 = (x: number) => Math.max(0, Math.min(1, x))

const STROKE = 2
const VISIBLE_RADIUS = 8
const CLICK_RADIUS = 14
const FULL_RADIUS = CLICK_RADIUS

const makeCircle = () => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  group.setAttribute('width', String(FULL_RADIUS * 2))
  group.setAttribute('height', String(FULL_RADIUS * 2))
  group.setAttribute(
    'viewBox',
    `-${FULL_RADIUS} -${FULL_RADIUS} ${FULL_RADIUS * 2} ${FULL_RADIUS * 2}`,
  )

  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  circle.setAttribute('r', String(VISIBLE_RADIUS))
  circle.setAttribute('fill', 'white')
  circle.setAttribute('stroke', 'black')
  circle.setAttribute('stroke-width', String(STROKE))
  circle.setAttribute('class', CONTROL_POINT_CLASS)
  group.appendChild(circle)

  const clickTarget = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  )
  clickTarget.setAttribute('r', String(CLICK_RADIUS))
  clickTarget.setAttribute('fill', 'transparent')
  clickTarget.setAttribute('stroke', 'transparent')
  clickTarget.setAttribute('style', 'cursor: move;')
  group.appendChild(clickTarget)

  return { group, circle, clickTarget }
}

export class ControlPoint {
  element: SVGGraphicsElement
  circle: SVGCircleElement
  tooltip: ReturnType<typeof addTooltip>
  protected container: ContainerType
  protected isDragging: boolean = false
  protected isHovered: boolean = false
  readonly point: Point

  public deletable = true
  readonly DELETE_EVENT = 'deleteme'
  readonly eventTarget = new EventTarget()
  private grabX = 0
  private grabY = 0

  private toDataSpace: (x: number) => number

  static styleElement = undefined as HTMLStyleElement | undefined

  constructor(
    container: ContainerType,
    point: Point,
    toDataSpace: (x: number) => number,
    deleteEventCallback?: (event: CustomEvent) => void,
    isNewPointFromPointer = false,
  ) {
    const { group, circle } = makeCircle()
    this.element = group
    this.circle = circle
    this.point = point
    this.container = container
    this.toDataSpace = toDataSpace

    this.tooltip = addTooltip(this.container.svg)

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
    this.point.eventTarget.addEventListener('updated', () =>
      this.positionElement(),
    )

    this.setupInteraction()
    if (isNewPointFromPointer) this.startInteraction(true)
  }

  remove() {
    this.tooltip.remove()
    this.container.removeChild(this.element)
  }

  positionElement() {
    const { x, y } = this.point
    const [xSvg, ySvg] = this.container.normalizedToSvg(x, y)
    this.element.setAttribute('x', String(xSvg - FULL_RADIUS))
    this.element.setAttribute('y', String(ySvg - FULL_RADIUS))

    const dataValue = this.toDataSpace(x)
    this.tooltip.update(String(dataValue), xSvg, ySvg)
  }

  movePoint(e: PointerEvent) {
    const [x, y] = this.container.domToNormalized(e.clientX, e.clientY)
    this.point.setPosition(clamp0to1(x + this.grabX), clamp0to1(y + this.grabY))
    this.positionElement()
  }

  update() {
    this.circle.setAttribute('stroke-width', String(STROKE))
    if (this.isHovered) {
      this.circle.setAttribute('stroke-width', String(STROKE + 1))
      this.tooltip.show()
    } else {
      this.tooltip.hide()
    }
    if (this.isDragging) {
      this.circle.setAttribute('stroke-width', String(STROKE * 2))
    }
  }

  startInteraction(forceDragging = false) {
    this.isDragging = forceDragging
    if (!this.isDragging && this.deletable) {
      this.circle.setAttribute('stroke', 'red') // deleteable
    }
    const onPointerMove = (e: PointerEvent) => {
      this.isDragging = true
      this.circle.setAttribute('stroke', 'black')
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
      this.isDragging = false
      this.update()
    }

    document.addEventListener('pointerup', onPointerUp)
  }

  setupInteraction() {
    this.element.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      this.circle.setAttribute('stroke-width', String(STROKE * 2))
      const [x, y] = this.container.domToNormalized(
        event.clientX,
        event.clientY,
      )
      this.grabX = this.point.x - x
      this.grabY = this.point.y - y
      this.startInteraction()
    })
    this.element.addEventListener('pointerenter', () => {
      this.isHovered = true
      this.update()
    })
    this.element.addEventListener('pointerleave', () => {
      this.isHovered = false
      this.update()
    })
  }

  setColor(color: string) {
    this.circle.setAttribute('fill', color)
  }
}
