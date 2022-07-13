import { ContainerType } from './Container'

const SCALE_SENSITIVITY = 1.1

export const WheelZoom = (container: ContainerType) => {
  container.domElement.addEventListener('wheel', (e) => {
    e.preventDefault()
    e.stopPropagation()

    const scaleFactor = e.deltaY > 0 ? SCALE_SENSITIVITY : 1 / SCALE_SENSITIVITY

    const [targetX, targetY] = container
      .domToNormalized(e.clientX, e.clientY)
      // clamp to avoid bug when cursor out of bounds
      .map((coord) => Math.min(1, Math.max(0, coord)))

    const [left, right, bottom, top] = container.getViewBox()
    const newLeft = left - (targetX - left) * (scaleFactor - 1)
    const newRight = (right - left) * scaleFactor + newLeft
    const newBottom = bottom - (targetY - bottom) * (scaleFactor - 1)
    const newTop = (top - bottom) * scaleFactor + newBottom
    container.setViewBox(
      Math.max(0, newLeft),
      Math.min(1, newRight),
      Math.max(0, newBottom),
      Math.min(1, newTop)
    )
  })
}
