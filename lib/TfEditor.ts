import { Container } from './Container'
import { ControlPoint } from './ControlPoint'

export const TfEditor = (mount: HTMLElement) => {
  const container = Container(mount)

  const points = [[0, 0], [1, 1]]
  points.forEach(point => {
    ControlPoint(container, point)
  })

  return {
    points
  }
}
