export const ColorRange = () => {
  let colorRange: [number, number] = [0, 1]
  const eventTarget = new EventTarget()
  return {
    getColorRange: () => [...colorRange],
    setColorRange: (normalizedStart: number, normalizedEnd: number) => {
      colorRange = [normalizedStart, normalizedEnd]
      eventTarget.dispatchEvent(new CustomEvent('updated'))
    },
    eventTarget,
  }
}

export type ColorRangeType = ReturnType<typeof ColorRange>
