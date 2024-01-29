export const createDataRange = () => {
  let range = [0, 1] as [number, number]

  const eventTarget = new EventTarget()

  const setRange = (newRange: [number, number]) => {
    range = newRange
    eventTarget.dispatchEvent(new CustomEvent('updated', { detail: range }))
  }

  const toDataSpace = (x: number) => {
    const [start, end] = range
    const width = end - start
    return x * width + start
  }

  return {
    setRange,
    toDataSpace,
    eventTarget,
  }
}

export type DataRange = ReturnType<typeof createDataRange>
