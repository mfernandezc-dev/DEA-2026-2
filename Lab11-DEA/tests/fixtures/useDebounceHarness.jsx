import { act, StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useDebounce from '../../src/hooks/useDebounce.js'

window.IS_REACT_ACT_ENVIRONMENT = true

const root = createRoot(document.getElementById('root'))
const originalSetTimeout = window.setTimeout
const originalClearTimeout = window.clearTimeout
const timers = new Map()
let clock = 0
let nextTimerId = 0
let latestValue
let updates = []

// Control only this isolated test page's clock, never the application's clock.
window.setTimeout = (callback, delay = 0, ...args) => {
  const id = ++nextTimerId
  timers.set(id, { callback, args, due: clock + Math.max(0, Number(delay)) })
  return id
}
window.clearTimeout = (id) => timers.delete(id)

export default function HookProbe({ value, delay }) {
  const debouncedValue = useDebounce(value, delay)

  useEffect(() => {
    latestValue = debouncedValue
    updates.push(debouncedValue)
  }, [debouncedValue])

  return <output id="debounced-value">{JSON.stringify(debouncedValue)}</output>
}

function render(value, delay) {
  act(() => root.render(<StrictMode><HookProbe value={value} delay={delay} /></StrictMode>))
}

function unmount() {
  act(() => root.render(null))
}

window.debounceHarness = {
  reset(value, delay) {
    unmount()
    clock = 0
    updates = []
    render(value, delay)
  },
  render,
  unmount,
  advance(milliseconds) {
    const target = clock + milliseconds
    let next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]

    while (next && next[1].due <= target) {
      const [id, timer] = next
      timers.delete(id)
      clock = timer.due
      act(() => timer.callback(...timer.args))
      next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]
    }

    clock = target
  },
  snapshot() {
    return {
      value: latestValue,
      updates: [...updates],
      pendingCount: timers.size,
      remainingDelays: [...timers.values()].map((timer) => timer.due - clock),
    }
  },
  dispose() {
    act(() => root.unmount())
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
    window.IS_REACT_ACT_ENVIRONMENT = false
  },
}
