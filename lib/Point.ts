const clamp0to1 = (x: number) => Math.max(0, Math.min(1, x))

export class Point {
  private _x!: number
  private _y!: number
  eventTarget = new EventTarget()

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  get x() {
    return this._x
  }

  set x(newX: number) {
    this._x = clamp0to1(newX)
    this.dispatchUpdatedEvent()
  }

  get y() {
    return this._y
  }

  set y(newY: number) {
    this._y = clamp0to1(newY)
    this.dispatchUpdatedEvent()
  }

  setPosition(x: number, y: number) {
    this.x = x
    this.y = y
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: [this.x, this.y] }),
    )
  }
}
