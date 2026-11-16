import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, openSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectCdp } from './helpers/cdpClient.mjs'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const backend = path.resolve(frontend, '../backend')
const evidenceRoot = path.join(frontend, 'evidencias', 'lab12')
await mkdir(evidenceRoot, { recursive: true })
const evidence = await mkdtemp(path.join(evidenceRoot, 'run-'))
const appUrl = 'http://localhost:5173/'
const apiUrl = 'http://127.0.0.1:8000/api/'
const settingsPath = path.join(backend, 'config', 'settings.py')
const originalSettings = await readFile(settingsPath)
const originalDatabaseHash = createHash('sha256').update(await readFile(path.join(backend, 'db.sqlite3'))).digest('hex')
const inheritedTestPath = path.join(frontend, 'tests', 'browser.test.mjs')
const inheritedTestHash = createHash('sha256').update(await readFile(inheritedTestPath)).digest('hex')
const rows = []
const requests = new Map()
const abortTrace = []
const logs = []
const exceptions = []
let stage = 'setup'
let guard
let vite
let browser
let page
let tools
let baseline
let settingsRestored = true
let finalServerPid
let guardSequence = 0
const guardJobs = new Map()

async function snapshotData() {
  const snapshot = {}
  for (const resource of ['exams', 'questions', 'options']) {
    const records = []
    for (let number = 1; number < 100; number += 1) {
      const response = await fetch(`${apiUrl}${resource}/?page=${number}`)
      assert.equal(response.status, 200)
      const data = await response.json()
      records.push(...data.results)
      if (!data.next) break
    }
    snapshot[resource] = records
  }
  return snapshot
}

function guardAction(action) {
  return new Promise((resolve, reject) => {
    const id = ++guardSequence
    const timer = setTimeout(() => { guardJobs.delete(id); reject(new Error(`Guard action timed out: ${action}`)) }, 45000)
    guardJobs.set(id, { resolve, reject, timer })
    guard.send({ id, action })
  })
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Owned server exited: ${url}`)
    try { if ((await fetch(url)).status === 200) return } catch { /* Wait only for servers started by this test. */ }
    await delay(100)
  }
  throw new Error(`Server did not become ready: ${url}`)
}

async function screenshot(client, filename) {
  await client.send('Page.bringToFront')
  await client.screenshot(path.join(evidence, filename))
}

async function scrollToExams() {
  await page.evaluate('document.querySelector("#exams").scrollIntoView({ block: "start" })')
}

async function triggerListReload() {
  await page.evaluate('document.querySelector("#exams .section-heading button").click()')
  await page.waitFor('Boolean(document.querySelector(".exam-form"))')
  await page.evaluate('document.querySelector(".exam-actions button:last-child").click()')
}

async function waitForData() {
  await page.waitFor('document.querySelector(".exam-list")?.dataset.status === "success" && document.querySelectorAll(".exam-table tbody tr").length === 2')
}

async function showToolsPanel(panel) {
  return tools.evaluate(`(async () => {
    const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
    await UI.ViewManager.ViewManager.instance().showView(${JSON.stringify(panel)});
    return true;
  })()`)
}

function addRow(test, request, status, observed, type, screenshotPath) {
  rows.push({ test, request, status, observed, type, result: 'correcto', evidence: screenshotPath })
  console.log(`PASS ${test}`)
}

try {
  const guardLog = openSync(path.join(evidence, 'cors-guard.log'), 'ax')
  guard = spawn(process.execPath, [path.join(frontend, 'tests', 'helpers', 'corsRestoreGuard.mjs'), backend, evidence], {
    cwd: frontend, stdio: ['ignore', guardLog, guardLog, 'ipc'], windowsHide: true,
  })
  await new Promise((resolve, reject) => {
    guard.once('error', reject)
    guard.on('message', (message) => {
      if (message.ready) return resolve()
      const job = guardJobs.get(message.id)
      if (!job) return
      clearTimeout(job.timer)
      guardJobs.delete(message.id)
      if (message.ok) job.resolve(message)
      else job.reject(new Error(message.error))
    })
  })
  await guardAction('start')
  baseline = await snapshotData()
  assert.deepEqual(Object.fromEntries(Object.entries(baseline).map(([resource, data]) => [resource, data.length])), { exams: 2, questions: 12, options: 24 })
  await writeFile(path.join(evidence, 'original-data.json'), JSON.stringify(baseline, null, 2), { flag: 'wx' })
  const corsResponse = await fetch(`${apiUrl}exams/`, { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(corsResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173')

  const viteLog = openSync(path.join(evidence, 'vite-console.log'), 'ax')
  vite = spawn(process.execPath, [path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: frontend, detached: true, windowsHide: true, stdio: ['ignore', viteLog, viteLog],
    env: { ...process.env, VITE_API_BASE_URL: apiUrl },
  })
  await waitForServer(appUrl, vite)
  const profile = await mkdtemp(path.join(frontend, 'node_modules', '.cache', 'lab12-errors-browser-'))
  const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--remote-allow-origins=devtools://devtools', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(100)
  const port = (await readFile(portFile, 'utf8')).split('\n')[0].trim()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  page = await connectCdp(target.webSocketDebuggerUrl)
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  page.onEvent((event) => {
    if (event.method === 'Network.requestWillBeSent' && event.params.request.url.startsWith(apiUrl)) {
      requests.set(event.params.requestId, { id: event.params.requestId, stage, started: event.params.timestamp, method: event.params.request.method, url: event.params.request.url, body: event.params.request.postData, initiator: event.params.initiator })
    } else if (event.method === 'Network.responseReceived' && requests.has(event.params.requestId)) {
      Object.assign(requests.get(event.params.requestId), { status: event.params.response.status, headers: event.params.response.headers })
    } else if (event.method === 'Network.loadingFinished' && requests.has(event.params.requestId)) {
      const item = requests.get(event.params.requestId)
      item.finished = event.params.timestamp
      page.send('Network.getResponseBody', { requestId: event.params.requestId }).then((body) => { item.responseBody = body.body }).catch(() => {})
    } else if (event.method === 'Network.loadingFailed' && requests.has(event.params.requestId)) {
      Object.assign(requests.get(event.params.requestId), { failed: event.params.errorText, canceled: event.params.canceled, corsError: event.params.corsErrorStatus, ended: event.params.timestamp })
    } else if (event.method === 'Log.entryAdded') {
      logs.push({ stage, ...event.params.entry })
    } else if (event.method === 'Runtime.exceptionThrown') {
      exceptions.push({ stage, ...event.params.exceptionDetails })
    } else if (event.method === 'Runtime.consoleAPICalled') {
      const args = event.params.args.map((arg) => arg.value)
      if (args[0] === '__LAB12_ABORT_TRACE__') abortTrace.push({ stage, ...JSON.parse(args[1]) })
    }
  })
  await page.send('Network.enable')
  await page.send('Log.enable')
  const toolsUrl = `devtools://devtools/bundled/devtools_app.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`
  const toolsTarget = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(toolsUrl)}`, { method: 'PUT' })).json()
  tools = await connectCdp(toolsTarget.webSocketDebuggerUrl)
  await tools.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await tools.waitFor('Boolean(document.querySelector(".console-view"))')
  await showToolsPanel('console')

  stage = 'normal'
  await page.send('Page.navigate', { url: `${appUrl}#exams` })
  await waitForData()
  await scrollToExams()
  assert.equal(await page.evaluate('document.querySelectorAll(".exam-pagination button").length'), 2)
  assert.ok([...requests.values()].some((request) => request.stage === stage && request.status === 200))
  await screenshot(page, '01-listado-examenes.png')
  addRow('Funcionamiento normal', 'GET /api/exams/?page=1', 200, 'Dos exámenes, tabla y controles de paginación; sin bloqueo CORS.', 'satisfactoria', '01-listado-examenes.png')

  stage = 'loading'
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 3000, downloadThroughput: -1, uploadThroughput: -1 })
  await triggerListReload()
  await page.waitFor('document.querySelector(".exam-list")?.dataset.status === "loading" && document.querySelectorAll(".exam-skeletons .skeleton-card").length === 3')
  await scrollToExams()
  await screenshot(page, '02-estado-carga.png')
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await waitForData()
  addRow('Estado de carga real', 'GET /api/exams/?page=1', 200, 'Tres esqueletos durante una petición real con latencia de red aplicada por Chrome; después aparecen los datos.', 'satisfactoria', '02-estado-carga.png')

  stage = 'cors-blocked'
  await page.send('Log.clear')
  await page.send('Runtime.discardConsoleEntries')
  await showToolsPanel('console')
  settingsRestored = false
  try {
    await guardAction('disable')
    const blockedResponse = await fetch(`${apiUrl}exams/`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(blockedResponse.status, 200)
    assert.equal(blockedResponse.headers.get('access-control-allow-origin'), null)
    await triggerListReload()
    await page.waitFor('document.querySelector(".exam-list")?.dataset.status === "error"')
    assert.ok([...requests.values()].some((request) => request.stage === stage && request.corsError?.corsError === 'MissingAllowOriginHeader'))
    await tools.waitFor('document.body.innerText.includes("blocked by CORS policy")')
    await screenshot(tools, '03-error-cors-consola.png')
    await scrollToExams()
    await screenshot(page, '04-error-cors-interfaz.png')
    addRow('Bloqueo CORS intencional', 'GET /api/exams/?page=1', '200 en Django; respuesta bloqueada en el navegador', 'Chrome informa MissingAllowOriginHeader; Axios no puede leer la respuesta y React ofrece Reintentar.', 'error provocado', '03-error-cors-consola.png; 04-error-cors-interfaz.png')
  } finally {
    await guardAction('restore')
    settingsRestored = (await readFile(settingsPath)).equals(originalSettings)
    assert.ok(settingsRestored)
  }
  stage = 'cors-restored'
  await page.evaluate('document.querySelector(".exam-list button").click()')
  await waitForData()
  await scrollToExams()
  await screenshot(page, '05-cors-restaurado.png')
  addRow('Restauración de CORS', 'GET /api/exams/?page=1', 200, 'Configuración original restaurada byte por byte; Reintentar vuelve a mostrar los dos exámenes.', 'satisfactoria', '05-cors-restaurado.png')

  stage = 'validation'
  await showToolsPanel('network')
  await page.evaluate('document.querySelector("#exams .section-heading button").click()')
  await page.waitFor('Boolean(document.querySelector(".exam-form"))')
  assert.equal(await page.evaluate('document.querySelector("#exam-title").value'), '')
  await page.evaluate('document.querySelector(".exam-form").requestSubmit()')
  await page.waitFor('document.querySelector("#exam-title-error")?.textContent === "Este campo no puede estar vacío."')
  const invalidRequest = [...requests.values()].findLast((request) => request.stage === stage && request.method === 'POST' && request.status === 400)
  assert.ok(invalidRequest)
  assert.equal(JSON.parse(invalidRequest.body).title, '')
  for (let attempt = 0; attempt < 30 && !invalidRequest.responseBody; attempt += 1) await delay(100)
  assert.deepEqual(JSON.parse(invalidRequest.responseBody), { title: ['This field may not be blank.'] })
  await page.evaluate('document.querySelector(".exam-form").scrollIntoView({ block: "start" })')
  await screenshot(page, '06-error-validacion-formulario.png')
  await tools.evaluate(`(async () => {
    const Logs = await import('devtools://devtools/bundled/models/logs/logs.js');
    const Network = await import('devtools://devtools/bundled/panels/network/network.js');
    const request = Logs.NetworkLog.NetworkLog.instance().requests().findLast(request => request.url().includes('/api/exams/') && request.requestMethod === 'POST');
    if (!request) throw new Error('The real POST request is missing from DevTools.');
    await Network.NetworkPanel.NetworkPanel.instance().selectAndActivateRequest(request, 'headers');
    return true;
  })()`)
  await tools.waitFor('document.body.innerText.includes("400 Bad Request")')
  await screenshot(tools, '07a-error-validacion-http400.png')
  await tools.evaluate(`(async () => {
    const Logs = await import('devtools://devtools/bundled/models/logs/logs.js');
    const Network = await import('devtools://devtools/bundled/panels/network/network.js');
    const request = Logs.NetworkLog.NetworkLog.instance().requests().findLast(request => request.url().includes('/api/exams/') && request.requestMethod === 'POST');
    await Network.NetworkPanel.NetworkPanel.instance().selectAndActivateRequest(request, 'response');
    return true;
  })()`)
  let responseRendered = false
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const snapshot = await tools.send('DOMSnapshot.captureSnapshot', { computedStyles: [] })
    if (snapshot.strings.some((text) => text.includes('This field may not be blank.'))) { responseRendered = true; break }
    await delay(100)
  }
  assert.ok(responseRendered, 'The real HTTP response is not rendered in DevTools.')
  await screenshot(tools, '07-error-validacion-respuesta-http.png')
  await writeFile(path.join(evidence, 'validation-response.json'), JSON.stringify(invalidRequest, null, 2))
  addRow('Validación del título vacío', 'POST /api/exams/ con title=""', 400, 'Django devuelve un error en title y React lo presenta en español; no se crea un examen.', 'error provocado', '06-error-validacion-formulario.png; 07a-error-validacion-http400.png; 07-error-validacion-respuesta-http.png')
  await page.evaluate('document.querySelector(".exam-actions button:last-child").click()')
  await waitForData()

  stage = 'server-off'
  await guardAction('stop')
  await triggerListReload()
  await page.waitFor('document.querySelector(".exam-list")?.dataset.status === "error"')
  assert.equal(await page.evaluate('document.querySelector(".exam-list button").textContent'), 'Reintentar')
  assert.equal(await page.evaluate('document.querySelectorAll(".movie-card").length'), 8)
  assert.ok([...requests.values()].some((request) => request.stage === stage && request.failed === 'net::ERR_CONNECTION_REFUSED'))
  await scrollToExams()
  await screenshot(page, '08-servidor-apagado.png')
  addRow('Django apagado intencionalmente', 'GET /api/exams/?page=1', null, 'Conexión rechazada; React conserva la aplicación y muestra un mensaje y Reintentar.', 'error provocado', '08-servidor-apagado.png')

  stage = 'recovery'
  await guardAction('start')
  await page.evaluate('document.querySelector(".exam-list button").click()')
  await waitForData()
  await scrollToExams()
  await screenshot(page, '09-recuperacion.png')
  addRow('Recuperación tras reiniciar Django', 'GET /api/exams/?page=1', 200, 'Reintentar carga nuevamente los dos exámenes sin recargar React.', 'satisfactoria', '09-recuperacion.png')

  stage = 'abort-diagnosis'
  await page.evaluate(`(() => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalAbort = XMLHttpRequest.prototype.abort;
    const controllerAbort = AbortController.prototype.abort;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) { this.__lab12Request = { method, url }; return originalOpen.call(this, method, url, ...rest); };
    XMLHttpRequest.prototype.abort = function(...args) {
      console.debug('__LAB12_ABORT_TRACE__', JSON.stringify({ kind: 'xhr.abort', ...this.__lab12Request, stack: new Error().stack, time: performance.now() }));
      return originalAbort.apply(this, args);
    };
    AbortController.prototype.abort = function(...args) {
      console.debug('__LAB12_ABORT_TRACE__', JSON.stringify({ kind: 'controller.abort', stack: new Error().stack, time: performance.now() }));
      return controllerAbort.apply(this, args);
    };
  })()`)
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 })
  await triggerListReload()
  await page.waitFor('document.querySelector(".exam-list")?.dataset.status === "loading"')
  for (let attempt = 0; attempt < 50 && ![...requests.values()].some((request) => request.stage === stage && request.method === 'GET' && !request.finished && !request.failed); attempt += 1) await delay(50)
  await page.evaluate('document.querySelector("#exams .section-heading button").click()')
  for (let attempt = 0; attempt < 50 && ![...requests.values()].some((request) => request.stage === stage && request.failed === 'net::ERR_ABORTED'); attempt += 1) await delay(100)
  const canceled = [...requests.values()].filter((request) => request.stage === stage && request.failed === 'net::ERR_ABORTED')
  assert.ok(canceled.length > 0)
  assert.ok(canceled.every((request) => request.canceled && request.method === 'GET' && request.url === `${apiUrl}exams/?page=1`))
  assert.ok(abortTrace.some((trace) => trace.kind === 'controller.abort' && trace.stack.includes('ExamList.jsx')))
  assert.ok(abortTrace.some((trace) => trace.kind === 'xhr.abort' && trace.url.includes('exams/')))
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await page.evaluate('document.querySelector(".exam-actions button:last-child").click()')
  await waitForData()
  await writeFile(path.join(evidence, 'abort-diagnosis.json'), JSON.stringify({ inheritedFailingTest: 'Browser console and local image requests have no errors', inheritedAssertion: 'tests/browser.test.mjs:377 assert.deepEqual(failedRequests, [])', inheritedCollector: 'tests/browser.test.mjs:206-207 records every Network.loadingFailed without filtering canceled requests', canceledRequests: canceled, abortTrace, note: 'These are new real-browser reproductions. The historical report recorded ERR_ABORTED without request URLs.' }, null, 2))
  addRow('Diagnóstico de cancelación', 'GET /api/exams/?page=1 cancelado al desmontar ExamList', null, 'AbortController ejecuta xhr.abort; Chrome registra canceled=true y ERR_ABORTED. Volver al listado recupera los datos.', 'cancelación esperada', 'abort-diagnosis.json')

  stage = 'final'
  assert.deepEqual(await snapshotData(), baseline)
  assert.equal(createHash('sha256').update(await readFile(path.join(backend, 'db.sqlite3'))).digest('hex'), originalDatabaseHash)
  assert.ok((await readFile(settingsPath)).equals(originalSettings))
  assert.equal(createHash('sha256').update(await readFile(inheritedTestPath)).digest('hex'), inheritedTestHash)
  assert.deepEqual(exceptions, [])
  const finalCors = await fetch(`${apiUrl}exams/`, { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(finalCors.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  addRow('Integridad final', 'GET de exams, questions y options', 200, '2 exámenes, 12 preguntas y 24 opciones idénticos al inicio; SQLite y settings.py con el mismo SHA-256.', 'satisfactoria', 'results.json')
} catch (error) {
  rows.push({ test: stage, result: 'incorrecto', type: 'error inesperado', error: error.stack })
  console.error(error)
  process.exitCode = 1
} finally {
  if (!settingsRestored && guard?.connected) {
    await guardAction('restore')
    settingsRestored = (await readFile(settingsPath)).equals(originalSettings)
  }
  if (guard?.connected) {
    const final = await guardAction('finish')
    finalServerPid = final.pid
  }
  if (page) await page.send('Browser.close').catch(() => {})
  page?.close()
  tools?.close()
  if (browser && browser.exitCode === null) await new Promise((resolve) => { browser.once('exit', resolve); browser.kill() })
  if (vite) vite.unref()
  await writeFile(path.join(evidence, 'network-events.json'), JSON.stringify([...requests.values()], null, 2))
  await writeFile(path.join(evidence, 'browser-console.json'), JSON.stringify({ logs, exceptions }, null, 2))
  const report = {
    executedAt: new Date().toISOString(), target: 'Real Chrome, React, Axios and Django; no mocked API responses',
    rows, settingsRestored, settingsSha256: createHash('sha256').update(await readFile(settingsPath)).digest('hex'),
    databaseUnchanged: createHash('sha256').update(await readFile(path.join(backend, 'db.sqlite3'))).digest('hex') === originalDatabaseHash,
    originalCounts: baseline && Object.fromEntries(Object.entries(baseline).map(([resource, records]) => [resource, records.length])),
    serversLeftRunning: { django: finalServerPid, vite: vite?.pid },
  }
  await writeFile(path.join(evidence, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ evidence: path.relative(frontend, evidence), passed: rows.filter((row) => row.result === 'correcto').length, failed: rows.filter((row) => row.result === 'incorrecto').length, settingsRestored, databaseUnchanged: report.databaseUnchanged, servers: report.serversLeftRunning }))
}
