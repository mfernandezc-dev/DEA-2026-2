import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PremieresSection from '../../src/components/PremieresSection/PremieresSection.jsx'
import PremieresCarousel from '../../src/components/PremieresCarousel/PremieresCarousel.jsx'
import '../../src/styles/global.css'

const root = createRoot(document.getElementById('root'))
const originalSetTimeout = window.setTimeout
const originalClearTimeout = window.clearTimeout
const timers = new Map()
let clock = 0
let nextTimerId = 0
let mountId = 0

// Freeze only this fixture's request clock so all three real UI states can be inspected.
window.setTimeout = (callback, delay = 0, ...args) => {
  const id = ++nextTimerId
  timers.set(id, { callback, args, due: clock + Math.max(0, Number(delay)) })
  return id
}
window.clearTimeout = (id) => timers.delete(id)

function perform(callback) {
  window.IS_REACT_ACT_ENVIRONMENT = true
  try {
    act(callback)
  } finally {
    window.IS_REACT_ACT_ENVIRONMENT = false
  }
}

window.premieresSectionHarness = {
  mount(options) {
    perform(() => root.render(<StrictMode><PremieresSection key={++mountId} requestOptions={options} /></StrictMode>))
  },
  mountCarousel(movies) {
    perform(() => root.render(<StrictMode><PremieresCarousel key={++mountId} movies={movies} /></StrictMode>))
  },
  pendingTimers: () => timers.size,
  advance(milliseconds) {
    const target = clock + milliseconds
    let next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]
    while (next && next[1].due <= target) {
      const [id, timer] = next
      timers.delete(id)
      clock = timer.due
      perform(() => timer.callback(...timer.args))
      next = [...timers.entries()].sort((first, second) => first[1].due - second[1].due)[0]
    }
    clock = target
  },
  dispose() {
    perform(() => root.unmount())
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
  },
}
