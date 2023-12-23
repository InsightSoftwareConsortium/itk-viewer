export class Point {
  private _x!: number
  private _y!: number
  eventTarget = new EventTarget()

  constructor(x: number, y: number) {
    this.setPosition(x, y)
  }

  get x() {
    return this._x
  }

  set x(newX: number) {
    this._x = newX
    this.dispatchUpdatedEvent()
  }

  get y() {
    return this._y
  }

  set y(newY: number) {
    this._y = newY
    this.dispatchUpdatedEvent()
  }

  setPosition(x: number, y: number) {
    this._x = x
    this._y = y
    this.dispatchUpdatedEvent()
  }

  dispatchUpdatedEvent() {
    this.eventTarget.dispatchEvent(
      new CustomEvent('updated', { detail: [this.x, this.y] }),
    )
  }
}
