import { ContainerType } from './Container'

const SCALE_SENSITIVITY = 1.1

export const WheelZoom = (container: ContainerType) => {
  container.root.addEventListener('wheel', (e) => {
    const scaleFactor = e.deltaY > 0 ? SCALE_SENSITIVITY : 1 / SCALE_SENSITIVITY

    const [targetX] = container.domToNormalized(e.clientX, e.clientY)

    const [left, right] = container.getViewBox()

    const newLeft = Math.max(
      0,
      left - Math.max(0, targetX - left) * (scaleFactor - 1),
    )
    const newRight = Math.min(1, (right - left) * scaleFactor + newLeft)

    if (newLeft === left && newRight === right) {
      return // nothing changed, don't consume event
    }

    e.preventDefault()
    e.stopPropagation()
    container.setViewBox(newLeft, newRight)
  })
}
