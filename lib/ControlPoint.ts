
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

export const ControlPoint = (container: iContainer, point: number[]) => {
  const shape = makeCircle()
  container.add(shape, point)

  const movePoint = (e: PointerEvent) => {
    const [x, y] = container.toNormalized(e.clientX, e.clientY)
    point[0] = x
    point[1] = y

    container.positionShape(shape, point)
  }

  // drag control point around
  shape.addEventListener('pointerdown', () => {
    document.addEventListener('pointermove', movePoint)
    const removeListeners = () => {
      document.removeEventListener('pointermove', movePoint)
      document.removeEventListener('pointerup', removeListeners)
    }
    document.addEventListener('pointerup', removeListeners)
  })
}
