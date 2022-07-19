import { ContainerType } from './Container'

const SCALE_SENSITIVITY = 1.1

export const WheelZoom = (container: ContainerType) => {
  container.root.addEventListener('wheel', (e) => {
    e.preventDefault()
    e.stopPropagation()

    const scaleFactor = e.deltaY > 0 ? SCALE_SENSITIVITY : 1 / SCALE_SENSITIVITY

    const [targetX, targetY] = container.domToNormalized(e.clientX, e.clientY)

    const [left, right, bottom, top] = container.getViewBox()

    const newLeft = Math.max(
      0,
      left - Math.max(0, targetX - left) * (scaleFactor - 1)
    )
    const newRight = (right - left) * scaleFactor + newLeft

    const newBottom = Math.max(
      0,
      bottom - Math.max(0, targetY - bottom) * (scaleFactor - 1)
    )
    const newTop = (top - bottom) * scaleFactor + newBottom

    container.setViewBox(
      newLeft,
      Math.min(1, newRight),
      newBottom,
      Math.min(1, newTop)
    )
  })
}
