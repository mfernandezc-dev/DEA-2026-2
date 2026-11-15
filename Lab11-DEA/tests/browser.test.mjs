import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'
import { runUseDebounceChecks } from './useDebounce.browser.mjs'
import { runWindowLayoutChecks, runUseWindowSizeChecks } from './useWindowSize.browser.mjs'
import { runUsePremieresChecks } from './usePremieres.browser.mjs'
import { runPremieresAppChecks, runPremieresSectionChecks } from './premieresSection.browser.mjs'
import { runInitialFavoriteCountCheck, runSharedStateChecks } from './sharedState.browser.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const browserPath = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((candidate) => existsSync(candidate))

assert.ok(browserPath, 'Set CHROME_PATH to an installed Chrome or Edge executable.')

const evidenceRoot = path.join(root, 'evidencias')
await mkdir(evidenceRoot, { recursive: true })
const evidenceDirectory = await mkdtemp(path.join(evidenceRoot, 'lab11-activities-9-10-'))
console.log(`Evidence directory: ${path.relative(root, evidenceDirectory)}`)

const results = []
const consoleMessages = []
const browserErrors = []
const failedRequests = []
const screenshots = []
const favoritesStorageKey = 'lab10-dea:favoriteIds'
const favoriteSelector = (id) => `.movie-card[aria-labelledby="movie-${id}"] .favorite-button`
let socket
let browser
let profile
let server
let nextId = 0
const pending = new Map()

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP timeout: ${method}`))
    }, 10000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails))
  return response.result.value
}

async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(50)
  }
  throw new Error(`Condition timed out: ${expression}`)
}

async function check(name, callback) {
  await callback()
  results.push({ name, status: 'passed' })
  console.log(`PASS ${name}`)
}

async function click(selector) {
  const point = await evaluate(`(async () => {
    const element = document.querySelector(${JSON.stringify(selector)})
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
    const rect = element.getBoundingClientRect()
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    if (!element.contains(document.elementFromPoint(x, y))) throw new Error('The click target is not visible at its measured position.')
    return { x, y }
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}

async function typeSearch(text) {
  await evaluate('document.querySelector("#movie-search").focus(); document.querySelector("#movie-search").select()')
  if (text) {
    await send('Input.insertText', { text })
  } else {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
  }
}

async function storedFavorites() {
  return evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(favoritesStorageKey)}))`)
}

async function reloadPage() {
  await evaluate('window.__browserReloadToken = true')
  await send('Page.reload', { ignoreCache: true })
  await waitFor('typeof window.__browserReloadToken === "undefined" && document.readyState === "complete"')
}

async function screenshot(filename, captureFullPage = true, preserveFocus = false) {
  await evaluate(`${preserveFocus ? '' : 'document.activeElement.blur();'} window.scrollTo(0, 0)`)
  await waitFor('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)')
  if (!captureFullPage) {
    await waitFor(`Array.from(document.querySelectorAll('.favorite-toast')).every(toast => {
      const rect = toast.getBoundingClientRect()
      return rect.top >= 0 && rect.bottom <= window.innerHeight
    })`)
  }
  const { cssContentSize } = await send('Page.getLayoutMetrics')
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: captureFullPage,
    ...(captureFullPage ? {
      clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 },
    } : {}),
  })
  const screenshotPath = path.join(evidenceDirectory, filename)
  await writeFile(screenshotPath, Buffer.from(image.data, 'base64'))
  screenshots.push(path.relative(root, screenshotPath).split(path.sep).join('/'))
}

async function captureSection(filename) {
  await evaluate('document.querySelector("#estrenos").scrollIntoView({ block: "start" })')
  await waitFor('Array.from(document.querySelectorAll("#estrenos img")).every(image => image.complete && image.naturalWidth > 0)')
  const clip = await evaluate(`(() => {
    const rect = document.querySelector('#estrenos').getBoundingClientRect()
    const x = Math.max(0, rect.left + window.scrollX - 16)
    return {
      x,
      y: rect.top + window.scrollY,
      width: Math.min(rect.width + 32, document.documentElement.scrollWidth - x),
      height: rect.height,
      scale: 1,
    }
  })()`)
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
  const screenshotPath = path.join(evidenceDirectory, filename)
  await writeFile(screenshotPath, Buffer.from(image.data, 'base64'))
  screenshots.push(path.relative(root, screenshotPath).split(path.sep).join('/'))
}

try {
  server = await createServer({
    root,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  })
  await server.listen()
  const address = server.httpServer.address()
  const url = `http://127.0.0.1:${address.port}/`
  const cacheDirectory = path.join(root, 'node_modules', '.cache')
  await mkdir(cacheDirectory, { recursive: true })
  profile = await mkdtemp(path.join(cacheDirectory, 'lab10-browser-'))
  browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' })
  browser.on('error', (error) => browserErrors.push(error.message))

  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) {
    await delay(100)
  }
  const port = (await readFile(portFile, 'utf8')).split('\n')[0].trim()
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  const target = await response.json()
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const request = pending.get(message.id)
      if (!request) return
      clearTimeout(request.timeout)
      pending.delete(message.id)
      if (message.error) request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    } else if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map((argument) => argument.value ?? argument.description).join(' ')
      consoleMessages.push({ type: message.params.type, text })
      if (['error', 'warning'].includes(message.params.type)) browserErrors.push(text)
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.text)
    } else if (message.method === 'Network.loadingFailed') {
      failedRequests.push(message.params.errorText)
    } else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      failedRequests.push(`${message.params.response.status} ${message.params.response.url}`)
    }
  })
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Network.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__premiereStates = []
    new MutationObserver(() => {
      const section = document.querySelector('.premieres-section')
      if (!section || window.__premiereStates.at(-1)?.status === section.dataset.status) return
      window.__premiereStates.push({
        status: section.dataset.status,
        time: performance.now(),
        skeletonCount: section.querySelectorAll('.skeleton-card').length,
        message: section.querySelector('.premieres-status')?.textContent || '',
      })
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-status'] })
  ` })
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  })
  await send('Page.navigate', { url })
  await waitFor('document.querySelectorAll(".movie-card").length === 8')

  await runInitialFavoriteCountCheck({ check, evaluate, waitFor, screenshot })

  await check('Original billboard: eight movies, 24 showtimes, header, banner and footer', async () => {
    assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
    assert.equal(await evaluate('Boolean(document.querySelector("header") && document.querySelector(".hero") && document.querySelector("footer"))'), true)
    assert.equal(await evaluate('document.querySelector(".hero-link").getAttribute("href")'), '#cartelera')
    await waitFor('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)')
    assert.equal(await evaluate('document.querySelectorAll(".hero img, #cartelera img").length'), 9)
  })

  const originalTitles = await evaluate('Array.from(document.querySelectorAll(".card-heading h3"), element => element.textContent)')
  await waitFor('localStorage.getItem("lab10-dea:favoriteIds") === "[]"')
  await delay(500)
  await screenshot('03-lab10-cartelera.png')

  await check('Reusable Button: primary banner link, secondary favorite buttons and preserved navigation', async () => {
    assert.equal(await evaluate('document.querySelector(".hero-link").classList.contains("button--primary")'), true)
    assert.equal(await evaluate('document.querySelectorAll("#cartelera button.button--secondary").length'), 8)
    assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).every(button => button.type === "button")'), true)
    await evaluate('window.__lab10DocumentToken = "same-document"')
    await click('.hero-link')
    await waitFor('location.hash === "#cartelera"')
    assert.equal(await evaluate('window.__lab10DocumentToken'), 'same-document')
  })

  await check('Favorites: add two movies through onClick, visual variants and no duplicated IDs', async () => {
    for (const id of ['lost-orbit', 'last-lighthouse']) {
      await click(favoriteSelector(id))
      await waitFor(`document.querySelector(${JSON.stringify(favoriteSelector(id))}).getAttribute('aria-pressed') === 'true'`)
    }
    await waitFor('JSON.parse(localStorage.getItem("lab10-dea:favoriteIds")).length === 2')
    const ids = await storedFavorites()
    assert.deepEqual(ids, ['lost-orbit', 'last-lighthouse'])
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button.button--primary").length'), 2)
    assert.equal(await evaluate('window.__lab10DocumentToken'), 'same-document')
    await screenshot('04-lab10-favoritas.png')
  })

  await check('Favorites: remove and re-add without changing other movies or reloading', async () => {
    await click(favoriteSelector('lost-orbit'))
    await waitFor('localStorage.getItem("lab10-dea:favoriteIds") === \'["last-lighthouse"]\'')
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(favoriteSelector('lost-orbit'))}).getAttribute('aria-pressed')`), 'false')
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(favoriteSelector('last-lighthouse'))}).getAttribute('aria-pressed')`), 'true')
    await click(favoriteSelector('lost-orbit'))
    await waitFor('JSON.parse(localStorage.getItem("lab10-dea:favoriteIds")).length === 2')
    assert.equal(await evaluate('window.__lab10DocumentToken'), 'same-document')
  })

  await check('localStorage: favorites and selected buttons survive an actual page reload', async () => {
    const beforeReload = await storedFavorites()
    await reloadPage()
    await waitFor('document.querySelectorAll(".favorite-button[aria-pressed=true]").length === 2')
    assert.deepEqual(await storedFavorites(), beforeReload)
    assert.equal(await evaluate('typeof window.__lab10DocumentToken'), 'undefined')
    await screenshot('05-lab10-favoritas-recargadas.png')
  })

  await check('Controlled search inside banner: onChange updates input immediately, not the list', async () => {
    await delay(500)
    assert.equal(await evaluate('Boolean(document.querySelector(".hero #movie-search"))'), true)
    await typeSearch('f')
    assert.equal(await evaluate('document.querySelector("#movie-search").value'), 'f')
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await typeSearch('')
    await delay(500)
  })

  await check('400 ms debounce: intermediate timers canceled, one console message and delayed result', async () => {
    const start = consoleMessages.length
    await evaluate('document.querySelector("#movie-search").focus()')
    for (const character of 'faro') {
      await send('Input.insertText', { text: character })
      await delay(25)
    }
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await delay(150)
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    const searchMessages = consoleMessages.slice(start).filter(({ text }) => text.startsWith('[MovieSearch]'))
    assert.deepEqual(searchMessages.map(({ text }) => text), ['[MovieSearch] Debounced search: faro'])
    await screenshot('06-lab10-busqueda.png')
  })

  await check('MovieList: partial title, case-insensitive matching, surrounding spaces and favorite state', async () => {
    await typeSearch(' FARO ')
    await waitFor('document.querySelector("#movie-search").value === " FARO " && document.querySelectorAll(".movie-card").length === 1')
    await delay(500)
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    assert.equal(await evaluate('document.querySelector(".favorite-button").getAttribute("aria-pressed")'), 'true')
    await typeSearch('cielo')
    await waitFor('document.querySelector(".card-heading h3")?.textContent === "Un cielo de papel"')
    assert.equal(await evaluate('document.querySelector(".favorite-button").getAttribute("aria-pressed")'), 'false')
  })

  await check('Empty state: unmatched title displays zero results and an accessible status message', async () => {
    await typeSearch('zzzz-no-existe')
    await waitFor('Boolean(document.querySelector(".empty-state"))')
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 0)
    assert.match(await evaluate('document.querySelector(".empty-state").textContent'), /No se encontraron películas/)
    assert.equal(await evaluate('document.querySelector(".empty-state").getAttribute("role")'), 'status')
    assert.match(await evaluate('document.querySelector(".movie-count").textContent'), /^0 películas/)
    await screenshot('07-lab10-estado-vacio.png')
  })

  await check('Clearing search restores all original data, schedules and favorites', async () => {
    await typeSearch('')
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".card-heading h3"), element => element.textContent)'), originalTitles)
    assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), 2)
  })

  await check('Removing all favorites persists an empty array after reload', async () => {
    await click(favoriteSelector('lost-orbit'))
    await click(favoriteSelector('last-lighthouse'))
    await waitFor('localStorage.getItem("lab10-dea:favoriteIds") === "[]"')
    await reloadPage()
    await waitFor('document.querySelectorAll(".favorite-button[aria-pressed=false]").length === 8')
    assert.deepEqual(await storedFavorites(), [])
  })

  await check('Saved IDs are validated: duplicates and IDs outside the original billboard are discarded', async () => {
    await evaluate('localStorage.setItem("lab10-dea:favoriteIds", JSON.stringify(["lost-orbit", "lost-orbit", "unknown", 123, null]))')
    await reloadPage()
    await waitFor('document.querySelectorAll(".favorite-button[aria-pressed=true]").length === 1')
    await waitFor('localStorage.getItem("lab10-dea:favoriteIds") === \'["lost-orbit"]\'')
    assert.deepEqual(await storedFavorites(), ['lost-orbit'])
  })

  await check('Desktop and mobile layouts preserve the billboard without horizontal overflow', async () => {
    for (const width of [1440, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: 1000, deviceScaleFactor: 1, mobile: width < 600,
      })
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
      if (width === 390) await screenshot('08-lab10-movil.png')
    }
  })

  await check('Browser console and local image requests have no errors', async () => {
    assert.deepEqual(browserErrors, [])
    assert.deepEqual(failedRequests, [])
  })

  await check('Favorite notification: adding shows one accessible message and preserves the existing counts', async () => {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
    })
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 0)
    await click(favoriteSelector('last-lighthouse'))
    await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película agregada a favoritos"')
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    assert.equal(await evaluate('document.querySelector(".favorite-toast [role=status]").getAttribute("aria-live")'), 'polite')
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), 2)
    assert.equal((await storedFavorites()).length, 2)
    assert.match(await evaluate('document.querySelector(".movie-count").textContent'), /^8 películas/)
    await screenshot('09-lab11-favorite-added.png', false)
  })

  await check('Favorite notification: removal replaces the existing message without duplicates', async () => {
    await click(favoriteSelector('last-lighthouse'))
    await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película eliminada de favoritos"')
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    assert.deepEqual(await storedFavorites(), ['lost-orbit'])
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), 1)
    await screenshot('10-lab11-favorite-removed.png', false)
  })

  await check('Favorite notification: rapid toggles stay deduplicated and do not block searching', async () => {
    for (const isFavorite of [true, false, true]) {
      await click(favoriteSelector('last-lighthouse'))
      await waitFor(`document.querySelector(${JSON.stringify(favoriteSelector('last-lighthouse'))}).getAttribute('aria-pressed') === '${isFavorite}'`)
      const message = isFavorite ? 'Película agregada a favoritos' : 'Película eliminada de favoritos'
      await waitFor(`document.querySelector('.favorite-toast [role=status]')?.textContent === ${JSON.stringify(message)}`)
      assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    }
    await typeSearch('faro')
    assert.equal(await evaluate('document.querySelector("#movie-search").value'), 'faro')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    assert.match(await evaluate('document.querySelector(".movie-count").textContent'), /^1 películas/)
    await typeSearch('')
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
  })

  await check('Favorite notification: mobile layout, automatic dismissal and persistence after reload', async () => {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 1000, deviceScaleFactor: 1, mobile: true,
    })
    await click(favoriteSelector('last-lighthouse'))
    await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película eliminada de favoritos"')
    for (const width of [390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: 1000, deviceScaleFactor: 1, mobile: true,
      })
      await waitFor(`(() => {
        const rect = document.querySelector('.favorite-toast').getBoundingClientRect()
        return rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth
      })()`)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
      if (width === 390) await screenshot('11-lab11-mobile-notification.png', false)
    }
    await waitFor('document.querySelectorAll(".favorite-toast").length === 0')
    await reloadPage()
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    assert.deepEqual(await storedFavorites(), ['lost-orbit'])
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), 1)
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 0)
  })

  await runWindowLayoutChecks({ check, evaluate, send, waitFor, screenshot, typeSearch, click, favoriteSelector, storedFavorites })
  await runPremieresAppChecks({ check, evaluate, send, waitFor, captureSection, click, typeSearch, storedFavorites, favoriteSelector })
  await runSharedStateChecks({ check, evaluate, send, waitFor, screenshot, click, typeSearch, storedFavorites, favoriteSelector, reloadPage, consoleMessages })
  await runUseDebounceChecks({ check, evaluate, send, waitFor, url })
  await runUseWindowSizeChecks({ check, evaluate, send, waitFor, url })
  await runUsePremieresChecks({ check, evaluate, send, waitFor, screenshot, url })
  await runPremieresSectionChecks({ check, evaluate, send, waitFor, captureSection, url })
  assert.deepEqual(browserErrors, [])
  assert.deepEqual(failedRequests, [])
} catch (error) {
  const diagnostics = socket?.readyState === WebSocket.OPEN ? await evaluate(`(() => {
    const track = document.querySelector('.premieres-track')
    return {
      width: window.innerWidth,
      activeElement: document.activeElement?.outerHTML,
      favoriteIds: localStorage.getItem('lab10-dea:favoriteIds'),
      progress: document.querySelector('.premieres-progress')?.textContent,
      nextDisabled: document.querySelector('.premieres-next')?.disabled,
      previousDisabled: document.querySelector('.premieres-previous')?.disabled,
      track: track ? {
        scrollLeft: track.scrollLeft,
        scrollWidth: track.scrollWidth,
        clientWidth: track.clientWidth,
        columns: track.style.getPropertyValue('--premiere-columns'),
        offsets: Array.from(track.children, card => card.offsetLeft),
        cardWidths: Array.from(track.children, card => card.getBoundingClientRect().width),
      } : null,
    }
  })()`).catch(() => null) : null
  results.push({ name: 'Browser verification', status: 'failed', error: error.stack, diagnostics })
  if (diagnostics) console.error(JSON.stringify(diagnostics, null, 2))
  console.error(error)
  process.exitCode = 1
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await send('Browser.close').catch(() => {})
    socket.close()
  }
  if (browser && browser.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => browser.once('exit', resolve)),
      delay(5000).then(() => browser.kill()),
    ])
  }
  if (server) await server.close()
  if (profile) {
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  await writeFile(path.join(evidenceDirectory, 'resultados-pruebas.json'), JSON.stringify({
    executedAt: new Date().toISOString(),
    results,
    screenshots,
    consoleMessages,
    browserErrors,
    failedRequests,
  }, null, 2) + '\n')
}
