import { act, StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import useWindowSize from '../../src/hooks/useWindowSize.js'
import usePremieres from '../../src/hooks/usePremieres.js'

window.IS_REACT_ACT_ENVIRONMENT = true

const root = createRoot(document.getElementById('root'))
const originalSetTimeout = window.setTimeout
const originalClearTimeout = window.clearTimeout
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener
const originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const resizeListeners = new Set()
const timers = new Map()
let cancelledTimers = []
let clock = 0
let nextTimerId = 0
let scheduledTimers = 0
let executedTimers = 0
let resizeRegistrations = 0
let resizeRemovals = 0
let sizeCommits = 0
let latestSize = null
let latestPremieres = null
let premiereHistory = []

// Instrument only this isolated page; the real billboard uses native events and timers.
window.setTimeout = (callback, delay = 0, ...args) => {
  const id = ++nextTimerId
  timers.set(id, { callback, args, due: clock + Math.max(0, Number(delay)) })
  scheduledTimers += 1
  return id
}
window.clearTimeout = (id) => {
  if (timers.has(id)) cancelledTimers.push(timers.get(id))
  timers.delete(id)
}
window.addEventListener = function (type, listener, ...options) {
  if (type === 'resize') {
    resizeListeners.add(listener)
    resizeRegistrations += 1
  }
  return originalAddEventListener.call(this, type, listener, ...options)
}
window.removeEventListener = function (type, listener, ...options) {
  if (type === 'resize') {
    resizeListeners.delete(listener)
    resizeRemovals += 1
  }
  return originalRemoveEventListener.call(this, type, listener, ...options)
}

export function WindowSizeProbe() {
  const size = useWindowSize()

  useEffect(() => {
    latestSize = size
    sizeCommits += 1
  }, [size])

  return <pre>{JSON.stringify(size, null, 2)}</pre>
}

export function PremieresProbe({ options }) {
  const { status, data, error, retry } = usePremieres(options)

  useEffect(() => {
    latestPremieres = { status, data, error, retry }
    premiereHistory.push(status)
  }, [status, data, error, retry])

  return (
    <pre>{JSON.stringify({
      status,
      movieCount: data.length,
      movieIds: data.map((movie) => movie.id),
      error,
    }, null, 2)}</pre>
  )
}

function unmount() {
  act(() => root.render(null))
}

function prepare() {
  unmount()
  if (timers.size || resizeListeners.size) throw new Error('A previous hook leaked resources.')
  clock = 0
  scheduledTimers = 0
  executedTimers = 0
  resizeRegistrations = 0
  resizeRemovals = 0
  sizeCommits = 0
  latestSize = null
  latestPremieres = null
  premiereHistory = []
  cancelledTimers = []
}

function setDimensions(width, height) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function renderPremieres(options) {
  act(() => root.render(<StrictMode><PremieresProbe options={options} /></StrictMode>))
}

window.lab11Hooks = {
  mountSize(width, height) {
    prepare()
    setDimensions(width, height)
    act(() => root.render(<StrictMode><WindowSizeProbe /></StrictMode>))
  },
  resize(width, height) {
    act(() => {
      setDimensions(width, height)
      window.dispatchEvent(new Event('resize'))
    })
  },
  mountPremieres(options) {
    prepare()
    renderPremieres(options)
  },
  renderPremieres,
  retry() {
    act(() => latestPremieres.retry())
  },
  getRetry: () => latestPremieres.retry,
  getSize: () => latestSize,
  unmount,
  advance(milliseconds) {
    const target = clock + milliseconds
    let next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]
    while (next && next[1].due <= target) {
      const [id, timer] = next
      timers.delete(id)
      clock = timer.due
      executedTimers += 1
      act(() => timer.callback(...timer.args))
      next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]
    }
    clock = target
  },
  flushCancelled() {
    const callbacks = cancelledTimers
    cancelledTimers = []
    for (const timer of callbacks) act(() => timer.callback(...timer.args))
  },
  snapshot() {
    return {
      size: latestSize,
      sizeCommits,
      activeResizeListeners: resizeListeners.size,
      resizeRegistrations,
      resizeRemovals,
      pendingTimers: timers.size,
      remainingDelays: [...timers.values()].map((timer) => timer.due - clock),
      scheduledTimers,
      executedTimers,
      premieres: latestPremieres ? {
        status: latestPremieres.status,
        data: latestPremieres.data,
        error: latestPremieres.error,
      } : null,
      premiereHistory: [...premiereHistory],
    }
  },
  dispose() {
    act(() => root.unmount())
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    Object.defineProperty(window, 'innerWidth', originalWidth)
    Object.defineProperty(window, 'innerHeight', originalHeight)
    window.IS_REACT_ACT_ENVIRONMENT = false
  },
}
