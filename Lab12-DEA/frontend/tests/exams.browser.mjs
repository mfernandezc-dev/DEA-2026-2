import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'
import api from '../src/api/client.js'
import { createExam, deleteExam, getExams } from '../src/api/exams.js'
import { runInitialFavoriteCountCheck } from './sharedState.browser.mjs'
import { runUseDebounceChecks } from './useDebounce.browser.mjs'
import { runWindowLayoutChecks, runUseWindowSizeChecks } from './useWindowSize.browser.mjs'
import { runUsePremieresChecks } from './usePremieres.browser.mjs'
import { runPremieresSectionChecks } from './premieresSection.browser.mjs'
import { startExamTestApi } from './helpers/examTestApi.mjs'
import { stopOwnedProcess } from './helpers/ownedProcess.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const fixtureMode = process.argv.includes('--fixture')
const browserPath = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
assert.ok(browserPath, 'Chrome or Edge is required.')
await mkdir(path.join(root, 'evidencias'), { recursive: true })
const evidenceDirectory = await mkdtemp(path.join(root, 'evidencias', fixtureMode ? 'lab12-fixture-' : 'lab12-django-'))
const results = []
const traffic = []
const browserErrors = []
const corsErrors = []
const temporaryTitles = new Set()
const prefix = `Prueba temporal Lab12 ${randomUUID()}`
let fixture
let django
let djangoOutput = ''
let server
let browser
let profile
let socket
let baseline
let childBaseline
let cleanupComplete = false
let createdId
let nextId = 0
let acceptDialog = false
let lastDialog = ''
const pending = new Map()
const requestMethods = new Map()

async function allRecords(resource = 'exams') {
  const records = []
  for (let page = 1; page < 100; page += 1) {
    const data = resource === 'exams' ? await getExams(page) : (await api.get(`${resource}/`, { params: { page } })).data
    records.push(...data.results)
    if (!data.next) return records
  }
  throw new Error('Pagination did not terminate.')
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP timeout: ${method}`))
    }, 15000)
    pending.set(id, { resolve, reject, timeout })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails))
  return response.result.value
}

async function waitFor(expression) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
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
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
}

async function screenshot(filename) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(path.join(evidenceDirectory, filename), Buffer.from(data, 'base64'))
}

async function captureSection(filename) {
  await evaluate('document.querySelector("#estrenos").scrollIntoView({ block: "start" })')
  await screenshot(filename)
}

async function typeSearch(text) {
  await evaluate('document.querySelector("#movie-search").focus(); document.querySelector("#movie-search").select()')
  if (text) await send('Input.insertText', { text })
  else {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
  }
}

async function fill(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await send('Input.insertText', { text })
}

const favoriteSelector = (id) => `.movie-card[aria-labelledby="movie-${id}"] .favorite-button`
const storedFavorites = () => evaluate('JSON.parse(localStorage.getItem("lab10-dea:favoriteIds"))')

try {
  if (fixtureMode) {
    fixture = await startExamTestApi()
    api.defaults.baseURL = fixture.baseURL
  } else {
    try {
      await getExams()
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error
      const backend = path.resolve(root, '../backend')
      const python = path.join(backend, '.venv', 'Scripts', 'python.exe')
      assert.ok(existsSync(python) && existsSync(path.join(backend, 'db.sqlite3')), 'Prepared backend is required.')
      django = spawn(python, ['-B', 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], {
        cwd: backend,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONPATH: '', DJANGO_SETTINGS_MODULE: 'config.settings', PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      django.stdout.on('data', (data) => { djangoOutput += data.toString() })
      django.stderr.on('data', (data) => { djangoOutput += data.toString() })
      let ready = false
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (django.exitCode !== null) throw new Error(`Django startup failed: ${djangoOutput}`)
        try { await getExams(); ready = true; break } catch (startupError) {
          if (startupError.code !== 'ECONNREFUSED') throw startupError
          await delay(100)
        }
      }
      assert.ok(ready, 'Django did not start.')
    }
  }

  baseline = await allRecords()
  if (!fixtureMode) childBaseline = { questions: await allRecords('questions'), options: await allRecords('options') }
  const setupCount = baseline.length === 0 ? 5 : (5 - (baseline.length % 5)) % 5
  for (let index = 0; index < setupCount; index += 1) {
    const title = `${prefix} preparación ${index}`
    temporaryTitles.add(title)
    await createExam({ title, description: 'Registro temporal exclusivo de la prueba.' })
  }
  const fullPageCount = baseline.length + setupCount
  process.env.VITE_API_BASE_URL = api.defaults.baseURL
  const url = 'http://localhost:5173/'
  try {
    const existing = await fetch(`${url}src/App.jsx`, { signal: AbortSignal.timeout(2000) })
    assert.ok(existing.ok && (await existing.text()).includes('/src/components/ExamSection/ExamSection.jsx'), 'The existing frontend is not this Lab12 application.')
    assert.ok(!fixtureMode, 'Fixture browser tests require port 5173 to be free; do not stop an existing user frontend.')
  } catch (error) {
    if (error.cause?.code !== 'ECONNREFUSED') throw error
    server = await createServer({ root, server: { host: 'localhost', port: 5173, strictPort: true } })
    await server.listen()
  }
  const cache = path.join(root, 'node_modules', '.cache')
  await mkdir(cache, { recursive: true })
  profile = await mkdtemp(path.join(cache, 'lab12-browser-'))
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  browser.on('error', (error) => browserErrors.push(error.message))
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(100)
  const port = (await readFile(portFile, 'utf8')).split('\n')[0].trim()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) {
      const job = pending.get(message.id)
      if (!job) return
      clearTimeout(job.timeout)
      pending.delete(message.id)
      if (message.error) job.reject(new Error(JSON.stringify(message.error)))
      else job.resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(message.params.exceptionDetails.text)
    } else if (message.method === 'Network.requestWillBeSent') {
      requestMethods.set(message.params.requestId, message.params.request.method)
    } else if (message.method === 'Network.responseReceived' && message.params.response.url.startsWith(api.defaults.baseURL)) {
      traffic.push({ method: requestMethods.get(message.params.requestId), url: message.params.response.url, status: message.params.response.status, allowOrigin: message.params.response.headers['access-control-allow-origin'] ?? message.params.response.headers['Access-Control-Allow-Origin'] })
    } else if (message.method === 'Network.loadingFailed' && message.params.corsErrorStatus) {
      corsErrors.push(message.params.corsErrorStatus)
    } else if (message.method === 'Page.javascriptDialogOpening') {
      lastDialog = message.params.message
      send('Page.handleJavaScriptDialog', { accept: acceptDialog }).catch((error) => browserErrors.push(error.message))
    }
  })
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__examStates = [];
    new MutationObserver(() => {
      const list = document.querySelector('.exam-list');
      if (list && window.__examStates.at(-1)?.status !== list.dataset.status) {
        window.__examStates.push({status: list.dataset.status, skeletons: list.querySelectorAll('.skeleton-card').length});
      }
    }).observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-status']});
  ` })
  await send('Page.navigate', { url })
  await waitFor('document.querySelector(".exam-list")?.dataset.status === "success" && document.querySelectorAll(".movie-card").length === 8')
  const context = { check, evaluate, waitFor, send, screenshot, captureSection, click, typeSearch, storedFavorites, favoriteSelector, url }
  await runInitialFavoriteCountCheck(context)
  await check('Exam GET renders real results, total count and a loading Skeleton', async () => {
    assert.equal(await evaluate('document.querySelectorAll(".exam-table tbody tr").length'), 5)
    assert.match(await evaluate('document.querySelector(".exam-summary").textContent'), new RegExp(`${fullPageCount} exámenes en total`))
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".exam-table thead th"), th => th.textContent)'), ['ID', 'Título', 'Descripción', 'Fecha de creación', 'Acción'])
    assert.equal(await evaluate('window.__examStates.some(state => state.status === "loading" && state.skeletons === 3)'), true)
    assert.equal(await evaluate('window.__examStates.some(state => state.status === "success")'), true)
    await evaluate('window.__examDocumentToken = "same-document"')
    await evaluate('document.querySelector("#exams").scrollIntoView({ block: "start" })')
    await screenshot('lab12-exam-list-desktop.png')
  })
  await check('Inherited movie catalog, favorites, controlled search and filter clearing remain independent', async () => {
    assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
    await click(favoriteSelector('lost-orbit'))
    await waitFor('document.querySelector(".favorite-count span").textContent === "1"')
    await typeSearch(' FARO ')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    await click('.clear-filters')
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    assert.deepEqual(await storedFavorites(), ['lost-orbit'])
    assert.equal(await evaluate('document.querySelectorAll(".exam-table tbody tr").length'), 5)
    await waitFor('document.querySelectorAll(".premiere-card").length === 4')
  })
  await check('Registration uses controlled fields and a real submit handler without native-only validation', async () => {
    await click('#exams .section-heading button')
    assert.equal(await evaluate('document.querySelector(".exam-form").noValidate'), true)
    assert.equal(await evaluate('document.querySelector("#exam-title").value'), '')
    await evaluate('document.querySelector(".exam-form").requestSubmit()')
    await waitFor('Boolean(document.querySelector("#exam-title-error"))')
    assert.equal(await evaluate('document.querySelector("#exam-title-error").textContent'), 'Este campo no puede estar vacío.')
    assert.ok(traffic.some((request) => request.method === 'POST' && request.status === 400))
    assert.equal(await evaluate('document.querySelector("#exam-title").getAttribute("aria-invalid")'), 'true')
  })
  const createdTitle = `${prefix} interfaz`
  temporaryTitles.add(createdTitle)
  await check('POST creates only one temporary exam, returns to the last page and never reloads', async () => {
    await fill('#exam-title', createdTitle)
    await fill('#exam-description', 'Descripción enviada desde React mediante Axios.')
    const previousPosts = traffic.filter((request) => request.method === 'POST' && request.status === 201).length
    await evaluate('document.querySelector(".exam-form").requestSubmit(); document.querySelector(".exam-form").requestSubmit()')
    await waitFor(`document.querySelector('.exam-list')?.dataset.status === 'success' && Array.from(document.querySelectorAll('.exam-table tbody th')).some(th => th.textContent === ${JSON.stringify(createdTitle)})`)
    createdId = (await allRecords()).find((exam) => exam.title === createdTitle).id
    assert.equal(traffic.filter((request) => request.method === 'POST' && request.status === 201).length - previousPosts, 1)
    assert.equal(await evaluate('document.querySelectorAll(".exam-table tbody tr").length'), 1)
    assert.match(await evaluate('document.querySelector(".exam-summary").textContent'), new RegExp(`${fullPageCount + 1} exámenes en total`))
    assert.match(await evaluate('document.querySelector(".exam-notice").textContent'), /registrado correctamente/)
    assert.equal(await evaluate('window.__examDocumentToken'), 'same-document')
  })
  await check('Pagination reaches earlier records and returns to the new record', async () => {
    await click('.exam-pagination button:first-child')
    await waitFor('document.querySelectorAll(".exam-table tbody tr").length === 5')
    assert.match(await evaluate('document.querySelector(".exam-summary").textContent'), new RegExp(`${fullPageCount + 1} exámenes en total`))
    await click('.exam-pagination button:last-child')
    await waitFor(`Boolean(document.querySelector('[data-exam-id="${createdId}"]'))`)
  })
  if (fixtureMode) {
    await check('A real HTTP 503 from the fixture shows ERROR and Reintentar recovers DATA', async () => {
      fixture.setReadFailure(true)
      await click('.exam-pagination button:first-child')
      await waitFor('document.querySelector(".exam-list").dataset.status === "error"')
      assert.match(await evaluate('document.querySelector(".exam-list [role=alert]").textContent'), /No se pudieron cargar/)
      assert.equal(await evaluate('document.querySelector(".exam-list button").textContent'), 'Reintentar')
      fixture.setReadFailure(false)
      await click('.exam-list button')
      await waitFor('document.querySelector(".exam-list").dataset.status === "success"')
      await click('.exam-pagination button:last-child')
      await waitFor(`Boolean(document.querySelector('[data-exam-id="${createdId}"]'))`)
    })
  }
  await check('Canceling deletion preserves the record and warns about CASCADE', async () => {
    const before = traffic.filter((request) => request.method === 'DELETE').length
    acceptDialog = false
    await click(`[data-exam-id="${createdId}"] button`)
    assert.match(lastDialog, /preguntas y opciones relacionadas/)
    assert.equal(traffic.filter((request) => request.method === 'DELETE').length, before)
    assert.equal(await evaluate(`Boolean(document.querySelector('[data-exam-id="${createdId}"]'))`), true)
  })
  if (fixtureMode) {
    await check('A failed DELETE keeps the exam visible and allows an explicit retry', async () => {
      fixture.setDeleteFailure(true)
      acceptDialog = true
      await click(`[data-exam-id="${createdId}"] button`)
      await waitFor('Boolean(document.querySelector(".exam-list [role=alert]"))')
      assert.equal(await evaluate(`Boolean(document.querySelector('[data-exam-id="${createdId}"]'))`), true)
      assert.equal(await evaluate(`document.querySelector('[data-exam-id="${createdId}"] button').disabled`), false)
      fixture.setDeleteFailure(false)
    })
  }
  await check('Confirmed DELETE accepts 204, updates totals and leaves an empty last page safely', async () => {
    acceptDialog = true
    await click(`[data-exam-id="${createdId}"] button`)
    await waitFor('document.querySelector(".exam-list").dataset.status === "success" && document.querySelectorAll(".exam-table tbody tr").length === 5')
    assert.ok(traffic.some((request) => request.method === 'DELETE' && request.status === 204))
    assert.match(await evaluate('document.querySelector(".exam-summary").textContent'), new RegExp(`${fullPageCount} exámenes en total`))
    assert.match(await evaluate('document.querySelector(".exam-notice").textContent'), /eliminado correctamente/)
    assert.equal(await evaluate('window.__examDocumentToken'), 'same-document')
    assert.equal((await allRecords()).some((exam) => exam.id === createdId), false)
  })
  await check('Exam table and form remain contained on mobile screens', async () => {
    for (const width of [390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: true })
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    }
    await click('#exams .section-heading button')
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    await evaluate('document.querySelector(".exam-form").scrollIntoView({ block: "start" })')
    await waitFor('document.querySelectorAll(".favorite-toast").length === 0')
    await screenshot('lab12-exam-form-mobile.png')
    await click('.exam-actions button:last-child')
    await waitFor('document.querySelector(".exam-list")?.dataset.status === "success"')
  })
  if (fixtureMode) {
    await check('A valid empty DRF response displays a useful empty state', async () => {
      fixture.setEmptyReads(true)
      await send('Page.reload')
      await waitFor('Boolean(document.querySelector(".exam-empty"))')
      assert.match(await evaluate('document.querySelector(".exam-summary").textContent'), /0 exámenes en total/)
      fixture.setEmptyReads(false)
      await send('Page.reload')
      await waitFor('document.querySelector(".exam-list")?.dataset.status === "success" && document.querySelectorAll(".movie-card").length === 8')
    })
  }
  await runWindowLayoutChecks(context)
  await runUseDebounceChecks(context)
  await runUseWindowSizeChecks(context)
  await runUsePremieresChecks(context)
  await runPremieresSectionChecks(context)
  assert.deepEqual(browserErrors, [])
  assert.deepEqual(corsErrors, [])
  assert.ok(traffic.filter((request) => request.method === 'GET' && request.status === 200).every((request) => request.allowOrigin === 'http://localhost:5173'))
} catch (error) {
  results.push({ name: 'Exam integration', status: 'failed', error: error.stack })
  console.error(error)
  process.exitCode = 1
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await send('Browser.close').catch(() => {})
    socket.close()
  }
  if (browser && browser.exitCode === null) await new Promise((resolve) => { browser.once('exit', resolve); browser.kill() })
  if (server) await server.close()
  if (fixture) { fixture.setReadFailure(false); fixture.setDeleteFailure(false); fixture.setEmptyReads(false) }
  if (baseline) {
    try {
      const protectedIds = new Set(baseline.map((exam) => exam.id))
      for (const exam of await allRecords()) {
        if (!protectedIds.has(exam.id) && temporaryTitles.has(exam.title)) await deleteExam(exam.id)
      }
      assert.deepEqual(await allRecords(), baseline)
      if (childBaseline) {
        assert.deepEqual(await allRecords('questions'), childBaseline.questions)
        assert.deepEqual(await allRecords('options'), childBaseline.options)
      }
      cleanupComplete = true
    } catch (error) {
      console.error('Temporary record cleanup or original-data preservation failed:', error)
      results.push({ name: 'Preserve original data', status: 'failed', error: error.stack })
      process.exitCode = 1
    }
  }
  if (django) {
    await stopOwnedProcess(django)
  }
  if (fixture) await fixture.close()
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  const report = { executedAt: new Date().toISOString(), target: fixtureMode ? 'local HTTP contract fixture, not Django' : 'real Django', results, traffic, browserErrors, corsErrors, cleanupComplete, originalExamCount: baseline?.length, originalQuestionCount: childBaseline?.questions.length, originalOptionCount: childBaseline?.options.length }
  await writeFile(path.join(evidenceDirectory, 'results.json'), JSON.stringify(report, null, 2) + '\n')
  if (djangoOutput) await writeFile(path.join(evidenceDirectory, 'django-console.txt'), djangoOutput)
  console.log(JSON.stringify({ target: report.target, passed: results.filter((result) => result.status === 'passed').length, failed: results.filter((result) => result.status === 'failed').length, cleanupComplete, evidence: path.relative(root, evidenceDirectory) }))
}
