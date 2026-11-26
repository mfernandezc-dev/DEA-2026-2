import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectCdp } from './helpers/cdpClient.mjs'
import { stopOwnedProcess } from './helpers/ownedProcess.mjs'
import api from '../src/services/api.js'
import productService from '../src/services/productService.js'
import categoryService from '../src/services/categoryService.js'
import { getAllPages } from '../src/services/getAllPages.js'

const lab = fileURLToPath(new URL('../../', import.meta.url))
const evidence = path.join(lab, 'evidencias/03-frontend')
const runtime = path.join(evidence, '.runtime')
const base = 'http://localhost:5173'
api.defaults.baseURL = 'http://localhost:8000/api/'
const prefix = `Prueba TechStore ${randomUUID()}`
const browserPath = process.env.CHROME_PATH || ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync)
assert.ok(browserPath, 'Chrome or Edge is required.')
await mkdir(runtime, { recursive: true })
const profile = await mkdtemp(path.join(runtime, 'chrome-'))
const uploadPath = path.join(runtime, `lab13-ui-${randomUUID()}.png`)
const replacementPath = path.join(runtime, `lab13-ui-${randomUUID()}.png`)
const invalidPath = path.join(runtime, `lab13-ui-${randomUUID()}.txt`)
const corruptPath = path.join(runtime, `lab13-ui-${randomUUID()}.png`)
await copyFile(path.join(lab, 'backend/catalog/assets/demo/lenovo-ideapad.png'), uploadPath)
await copyFile(path.join(lab, 'backend/catalog/assets/demo/wireless-mouse.png'), replacementPath)
await writeFile(invalidPath, 'Not an image')
await writeFile(corruptPath, 'Not a PNG despite the extension')

const results = []
const screenshots = []
const requests = []
const responses = []
const errors = []
const expectedInterceptionCancellations = []
const ownedImages = new Set()
const paused = []
let mode = ''
let stage = 'setup'
let browser
let client
let baseline
let temporaryCategory
let emptyCategory
let productId
let failure

function interceptionError(error) {
  // StrictMode may abort an intercepted request before CDP can fulfill it.
  if (error.message.includes('Invalid InterceptionId.')) expectedInterceptionCancellations.push({ stage, error: error.message })
  else errors.push({ stage, error: error.message })
}

async function check(name, callback) {
  stage = name
  await callback()
  results.push({ name, status: 'passed' })
  console.log(`PASS ${name}`)
}
const evaluate = expression => client.evaluate(expression)
const wait = expression => client.waitFor(expression)
const count = () => evaluate('document.querySelectorAll(".ts-product-card").length')
const card = id => `.ts-product-card[data-product-id="${id}"]`
async function click(selector) {
  const point = await evaluate(`(async () => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing click target: ' + ${JSON.stringify(selector)});
    el.scrollIntoView({block:'center', behavior:'instant'});
    await new Promise(resolve => requestAnimationFrame(resolve));
    const r=el.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2};
  })()`)
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}
async function fill(selector, value) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus(); document.querySelector(${JSON.stringify(selector)}).select()`)
  if (value !== '') await client.send('Input.insertText', { text: String(value) })
  else {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
  }
}
async function select(selector, value) {
  await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(String(value))}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`)
}
async function attach(filename) {
  const { root } = await client.send('DOM.getDocument')
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#product-image' })
  await client.send('DOM.setFileInputFiles', { nodeId, files: [filename] })
}
async function screenshot(name) {
  await evaluate('window.scrollTo(0,0)')
  await wait('Array.from(document.querySelectorAll(".techstore img")).filter(i=>i.getBoundingClientRect().top < innerHeight).every(i=>i.complete && i.naturalWidth>0)')
  const { cssContentSize } = await client.send('Page.getLayoutMetrics')
  const image = await client.send('Page.captureScreenshot', name === '10-confirmacion-eliminacion.png' ? { format: 'png', captureBeyondViewport: false } : { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } })
  await writeFile(path.join(evidence, name), Buffer.from(image.data, 'base64'))
  screenshots.push(name)
}
async function go(pathname = '/') {
  await client.send('Page.navigate', { url: base + pathname })
  await wait(`location.pathname === ${JSON.stringify(pathname)} && document.readyState === 'complete'`)
}
async function catalogReady(expected = 8) {
  await wait(`document.querySelector('#catalog-results')?.dataset.status === 'success' && document.querySelectorAll('.ts-product-card').length === ${expected}`)
}
async function filter(name) {
  const selector = await evaluate(`(() => { const buttons=[...document.querySelectorAll('.ts-category-filter button')]; return buttons.findIndex(b=>b.textContent.startsWith(${JSON.stringify(name)})); })()`)
  assert.ok(selector >= 0)
  await click(`.ts-category-filter button:nth-child(${selector + 1})`)
}
async function rememberProduct() {
  const product = await productService.getById(productId)
  const filename = decodeURIComponent(new URL(product.image).pathname).replace('/media/', '')
  assert.ok(filename.startsWith('catalog/products/lab13-ui-'))
  ownedImages.add(path.join(lab, 'backend/media', filename))
  return product
}
async function keyboard(key, code, windowsVirtualKeyCode) {
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
}

try {
  baseline = { categories: await getAllPages(categoryService), products: await getAllPages(productService) }
  assert.equal(baseline.categories.length, 3)
  assert.equal(baseline.products.length, 8)
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 100 && !existsSync(portFile); i += 1) await delay(100)
  const port = (await readFile(portFile, 'utf8')).split('\n')[0].trim()
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  client = await connectCdp(target.webSocketDebuggerUrl)
  client.onEvent(event => {
    if (event.method === 'Runtime.exceptionThrown') errors.push({ stage, detail: event.params.exceptionDetails })
    if (event.method === 'Network.requestWillBeSent' && event.params.request.url.includes('/api/')) requests.push({ stage, id: event.params.requestId, method: event.params.request.method, url: event.params.request.url })
    if (event.method === 'Network.responseReceived' && event.params.response.url.includes('/api/')) responses.push({ stage, url: event.params.response.url, status: event.params.response.status })
    if (event.method === 'Fetch.requestPaused') {
      const { request, requestId } = event.params
      if (mode === 'hold-products' && request.url.includes('/api/products/') && request.method === 'GET') paused.push(requestId)
      else if ((mode === 'fail-products' && request.url.includes('/api/products/') && request.method === 'GET') || (mode === 'fail-delete' && request.method === 'DELETE')) {
        client.send('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base }], body: Buffer.from('{"detail":"Controlled local test failure."}').toString('base64') }).catch(interceptionError)
      } else client.send('Fetch.continueRequest', { requestId }).catch(interceptionError)
    }
  })
  await client.send('Network.enable')
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*://localhost:8000/api/*', requestStage: 'Request' }, { urlPattern: '*://127.0.0.1:8000/api/*', requestStage: 'Request' }] })
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__techstoreDocument=crypto.randomUUID(); window.__createdUrls=[]; window.__revokedUrls=[];
    const create=URL.createObjectURL.bind(URL), revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=(file)=>{const url=create(file); window.__createdUrls.push(url); return url};
    URL.revokeObjectURL=(url)=>{window.__revokedUrls.push(url); return revoke(url)};` })
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false })

  await check('loading state is visible while real product requests are held', async () => {
    mode = 'hold-products'
    await go()
    await wait('document.querySelector("[data-state=loading]") !== null')
    mode = ''
    for (const requestId of paused.splice(0)) await client.send('Fetch.continueRequest', { requestId }).catch(() => {})
    await catalogReady()
  })
  await check('all eight original products are loaded across both real DRF pages', async () => {
    assert.equal(await count(), 8)
    const ids = await evaluate('[...document.querySelectorAll(".ts-product-card")].map(el=>Number(el.dataset.productId))')
    assert.deepEqual(ids, baseline.products.map(product => product.id))
    assert.ok(requests.some(request => request.url.includes('products/?page=2')))
    await screenshot('01-catalogo-completo.png')
  })
  await check('images, PEN prices, stock and nested categories match Django', async () => {
    await wait('[...document.querySelectorAll(".ts-product-card img")].every(i=>i.complete && i.naturalWidth>0)')
    for (const product of baseline.products) {
      const text = await evaluate(`document.querySelector(${JSON.stringify(card(product.id))}).innerText`)
      assert.ok(text.includes(product.name))
      assert.ok(text.toLowerCase().includes(product.category.name.toLowerCase()))
      assert.ok(text.includes(`${product.stock} en stock`))
      assert.match(text, /S\//)
    }
    assert.equal(requests.filter(request => /\/api\/categories\/\d+\//.test(request.url)).length, 0)
  })
  for (const [name, expected, filename] of [['Laptops', 3, '02-filtro-laptops.png'], ['Accessories', 3, '03-filtro-accessories.png'], ['Monitors', 2, '04-filtro-monitors.png']]) {
    await check(`API category filter ${name} includes products from every page`, async () => {
      await filter(name)
      await wait(`document.querySelectorAll('.ts-product-card').length===${expected}`)
      assert.equal(await evaluate(`document.querySelector('.ts-category-filter button[aria-pressed=true]').textContent.startsWith(${JSON.stringify(name)})`), true)
      await screenshot(filename)
    })
  }
  await check('Todos restores eight products without extra API traffic', async () => {
    const before = requests.length
    await filter('Todos')
    assert.equal(await count(), 8)
    assert.equal(requests.length, before)
  })
  await check('local name and description search combines with category and sends no requests', async () => {
    const before = requests.length
    await filter('Laptops')
    await fill('#product-search', 'Lenovo')
    await wait('document.querySelectorAll(".ts-product-card").length===1')
    await screenshot('05-busqueda-productos.png')
    await fill('#product-search', '15.6-inch')
    assert.equal(await count(), 1)
    await filter('Monitors')
    await wait('document.querySelector("[data-state=empty]") !== null')
    assert.equal(requests.length, before)
    await click('.ts-text-button')
    await catalogReady()
  })
  await check('a real temporary empty category produces an empty state', async () => {
    emptyCategory = await categoryService.create({ name: `${prefix} vacía`, description: 'Temporary empty category for real UI testing.' })
    await go()
    await catalogReady()
    await filter(prefix)
    await wait('document.querySelector("[data-state=empty]") !== null')
    assert.equal(await count(), 0)
    await categoryService.remove(emptyCategory.id)
    emptyCategory = null
    await go()
    await catalogReady()
  })
  await check('desktop, tablet and mobile have aligned cards and no horizontal overflow', async () => {
    for (const width of [1440, 768, 390]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 })
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `Overflow at ${width}`)
      const layout = await evaluate(`(() => { const cards=[...document.querySelectorAll('.ts-product-card')].map(el=>el.getBoundingClientRect()); return {columns:getComputedStyle(document.querySelector('.ts-product-grid')).gridTemplateColumns.split(' ').length, widths:cards.map(r=>Math.round(r.width)), heights:cards.map(r=>Math.round(r.height)), fit:getComputedStyle(document.querySelector('.ts-product-card img')).objectFit, buttons:[...document.querySelectorAll('.ts-card-actions .ts-button')].every(el=>el.getBoundingClientRect().height>=44)} })()`)
      assert.equal(layout.columns, width === 1440 ? 4 : width === 768 ? 2 : 1)
      assert.equal(new Set(layout.widths).size, 1)
      assert.equal(new Set(layout.heights.slice(0, layout.columns)).size, 1)
      assert.equal(layout.buttons, true)
      assert.equal(layout.fit, 'contain')
      if (width === 390) await screenshot('12-vista-movil.png')
    }
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false })
  })
  await check('broken product image uses the local fallback without changing the database', async () => {
    await client.send('Network.setBlockedURLs', { urls: ['*lenovo-ideapad.png'] })
    await go()
    await catalogReady()
    await wait('document.querySelector(".ts-product-card img").src.endsWith("/product-placeholder.svg") && document.querySelector(".ts-product-card img").naturalWidth>0')
    await client.send('Network.setBlockedURLs', { urls: [] })
    await go()
    await catalogReady()
  })
  await check('creation route loads API categories and client validation prevents invalid writes', async () => {
    temporaryCategory = await categoryService.create({ name: `${prefix} transitoria` })
    await click('.ts-navigation a[href="/products/new"]')
    await wait('document.querySelector(".ts-product-form") !== null')
    assert.equal(await evaluate('document.querySelectorAll("#product-category_id option").length'), 5)
    await screenshot('06-formulario-registro.png')
    const before = requests.filter(request => request.method === 'POST').length
    await click('button[type=submit]')
    await wait('document.querySelectorAll("[aria-invalid=true]").length===6')
    await screenshot('13-validacion-formulario.png')
    await fill('#product-price', '-1')
    await fill('#product-stock', '0.5')
    await click('button[type=submit]')
    assert.equal(await evaluate('document.querySelector("#product-stock").getAttribute("aria-invalid")'), 'true')
    assert.equal(requests.filter(request => request.method === 'POST').length, before)
  })
  await check('invalid and corrupt images are rejected before submission', async () => {
    await attach(invalidPath)
    await wait('document.querySelector("#image-error").textContent.includes("Selecciona una imagen")')
    await attach(corruptPath)
    await wait('document.querySelector("#image-error").textContent.includes("no contiene")')
    await attach(uploadPath)
    await wait('document.querySelector(".ts-image-preview img")?.naturalWidth>0 && !document.querySelector("button[type=submit]").disabled')
  })
  await check('real backend 400 category race is displayed without losing entered values', async () => {
    await fill('#product-name', prefix)
    await fill('#product-description', 'Producto temporal creado desde el navegador real.')
    await fill('#product-price', '123.45')
    await fill('#product-stock', '0')
    await select('#product-category_id', temporaryCategory.id)
    await categoryService.remove(temporaryCategory.id)
    temporaryCategory = null
    await click('button[type=submit]')
    await wait('document.querySelector(".ts-form-message")?.textContent.includes("servidor rechazó")')
    assert.match(await evaluate('document.querySelector("#category_id-error").textContent'), /categoría/)
    assert.equal(await evaluate('document.querySelector("#product-name").value'), prefix)
    assert.ok(responses.some(response => response.status === 400))
  })
  await check('a single real multipart creation navigates to the updated catalog without reload', async () => {
    const before = requests.filter(request => request.method === 'POST').length
    const token = await evaluate('window.__techstoreDocument')
    await select('#product-category_id', baseline.categories[0].id)
    await evaluate('document.querySelector("button[type=submit]").click(); document.querySelector("button[type=submit]").click()')
    await catalogReady(9)
    await wait('document.querySelector("[role=status]") !== null && document.body.innerText.includes("Producto creado correctamente.")')
    const products = await getAllPages(productService)
    const created = products.find(product => product.name === prefix)
    assert.ok(created)
    productId = created.id
    await rememberProduct()
    assert.equal(requests.filter(request => request.method === 'POST').length - before, 1)
    assert.equal(await evaluate('window.__techstoreDocument'), token)
    assert.equal(await evaluate(`${JSON.stringify(card(productId))} && document.querySelector(${JSON.stringify(card(productId) + ' .ts-availability')}).textContent`), 'Agotado')
    assert.equal(await evaluate('window.__createdUrls.every(url=>window.__revokedUrls.includes(url))'), true)
    await screenshot('07-producto-creado.png')
  })
  await check('edit route preloads all fields and is usable at tablet and mobile widths', async () => {
    await click(`${card(productId)} a`)
    await wait(`document.querySelector('#product-name')?.value === ${JSON.stringify(prefix)}`)
    assert.equal(await evaluate('document.querySelector("#product-stock").value'), '0')
    assert.equal(new URL(await evaluate('document.querySelector(".ts-image-preview img").src')).pathname, new URL((await productService.getById(productId)).image).pathname)
    await screenshot('08-formulario-edicion.png')
    for (const width of [768, 390]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width === 390 })
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth && document.querySelector("#product-name").getBoundingClientRect().width>100'), true)
    }
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false })
  })
  await check('editing without a new image preserves its URL and updates real stock and price', async () => {
    const before = await rememberProduct()
    const token = await evaluate('window.__techstoreDocument')
    await fill('#product-name', `${prefix} actualizado`)
    await fill('#product-price', '149.90')
    await fill('#product-stock', '7')
    await click('button[type=submit]')
    await catalogReady(9)
    const updated = await rememberProduct()
    await wait('document.body.innerText.includes("Producto actualizado correctamente.")')
    assert.equal(updated.image, before.image)
    assert.equal(updated.price, '149.90')
    assert.equal(updated.stock, 7)
    assert.equal(await evaluate('window.__techstoreDocument'), token)
    await screenshot('09-producto-actualizado.png')
  })
  await check('optional image replacement saves a different real image and revokes preview URLs', async () => {
    const before = await rememberProduct()
    await click(`${card(productId)} a`)
    await wait('document.querySelector(".ts-product-form") !== null')
    await attach(replacementPath)
    await wait('document.querySelector(".ts-image-preview img")?.naturalWidth>0 && !document.querySelector("button[type=submit]").disabled')
    await click('button[type=submit]')
    await catalogReady(9)
    assert.notEqual((await rememberProduct()).image, before.image)
    assert.equal(await evaluate('window.__createdUrls.every(url=>window.__revokedUrls.includes(url))'), true)
  })
  await check('form cancellation performs no write and browser back restores the route', async () => {
    const writes = requests.filter(request => ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)).length
    await click('.ts-navigation a[href="/products/new"]')
    await wait('document.querySelector(".ts-product-form") !== null')
    await attach(uploadPath)
    await wait('document.querySelector(".ts-image-preview img")?.naturalWidth>0')
    await click('.ts-form-bottom a')
    await catalogReady(9)
    assert.equal(await evaluate('window.__createdUrls.every(url=>window.__revokedUrls.includes(url))'), true)
    assert.equal(requests.filter(request => ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)).length, writes)
    await evaluate('history.back()')
    await wait('location.pathname==="/products/new" && document.querySelector(".ts-product-form") !== null')
    await click('.ts-back')
    await catalogReady(9)
  })
  await check('accessible deletion dialog names the product, traps focus and cancels without DELETE', async () => {
    const before = requests.filter(request => request.method === 'DELETE').length
    await click(`${card(productId)} button`)
    await wait('document.querySelector("dialog")?.open')
    assert.ok(await evaluate(`document.querySelector('dialog').innerText.includes(${JSON.stringify(prefix)})`))
    assert.equal(await evaluate('document.activeElement.textContent'), 'Cancelar')
    await screenshot('10-confirmacion-eliminacion.png')
    for (let i = 0; i < 4; i += 1) {
      await keyboard('Tab', 'Tab', 9)
      assert.equal(await evaluate('document.activeElement.closest("dialog") !== null || document.activeElement === document.body'), true)
    }
    await keyboard('Escape', 'Escape', 27)
    await wait('document.querySelector("dialog") === null')
    assert.equal(requests.filter(request => request.method === 'DELETE').length, before)
    assert.equal(await count(), 9)
  })
  await check('a controlled DELETE 503 retains the product and allows retry', async () => {
    await click(`${card(productId)} button`)
    mode = 'fail-delete'
    await click('.ts-dialog .ts-danger')
    await wait('document.querySelector("dialog [role=alert]") !== null')
    assert.equal(await count(), 9)
    assert.ok(await productService.getById(productId))
    mode = ''
  })
  await check('confirmed deletion sends one DELETE and updates counts without reloading', async () => {
    const before = requests.filter(request => request.method === 'DELETE').length
    const token = await evaluate('window.__techstoreDocument')
    await evaluate('document.querySelector(".ts-dialog .ts-danger").click(); document.querySelector(".ts-dialog .ts-danger").click()')
    await catalogReady(8)
    await wait('document.body.innerText.includes("Producto eliminado correctamente.")')
    await wait('document.querySelector("dialog") === null')
    assert.equal(requests.filter(request => request.method === 'DELETE').length - before, 1)
    await assert.rejects(productService.getById(productId), error => error.response?.status === 404)
    assert.equal(await evaluate('window.__techstoreDocument'), token)
    assert.equal(await evaluate('document.querySelector(".ts-stats strong").textContent'), '8')
    await screenshot('11-catalogo-despues-eliminacion.png')
  })
  await check('unknown application and product routes display Spanish not-found states', async () => {
    await go('/does-not-exist')
    await wait('document.body.innerText.includes("Página no encontrada")')
    await go(`/products/${productId}/edit`)
    await wait('document.body.innerText.includes("Producto no encontrado")')
    assert.ok(responses.some(response => response.status === 404))
  })
  await check('controlled catalog HTTP 503 displays an error and retry restores real data', async () => {
    mode = 'fail-products'
    await go()
    await wait('document.querySelector("[data-state=error]") !== null')
    await screenshot('14-estado-error.png')
    mode = ''
    await click('[data-state=error] button')
    await catalogReady()
  })
  await check('legacy quiz remains linked and functional, and the catalog is keyboard-accessible', async () => {
    await click('.ts-navigation a[href="/quiz"]')
    await wait('document.querySelector(".exam-list")?.dataset.status === "success"')
    assert.equal(await evaluate('document.querySelectorAll("#cartelera .movie-card").length'), 8)
    await click('.legacy-return a')
    await catalogReady()
    await evaluate('document.querySelector(".ts-category-filter button").focus()')
    await keyboard('Tab', 'Tab', 9)
    assert.equal(await evaluate('document.activeElement.closest(".ts-category-filter") !== null'), true)
    assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
  })
  await check('no unexpected JavaScript exceptions or individual category requests occurred', async () => {
    assert.deepEqual(errors, [])
    assert.equal(requests.filter(request => /\/api\/categories\/\d+\//.test(request.url)).length, 0)
  })
} catch (error) {
  failure = error
  results.push({ name: stage, status: 'failed', error: error.stack })
  console.error(error.stack)
  process.exitCode = 1
} finally {
  mode = ''
  const cleanupErrors = []
  try {
    for (const product of (await getAllPages(productService)).filter(product => product.name.startsWith(prefix))) {
      const filename = decodeURIComponent(new URL(product.image).pathname).replace('/media/', '')
      if (filename.startsWith('catalog/products/lab13-ui-')) ownedImages.add(path.join(lab, 'backend/media', filename))
      await productService.remove(product.id)
    }
    for (const category of (await getAllPages(categoryService)).filter(category => category.name.startsWith(prefix))) await categoryService.remove(category.id)
    for (const filename of ownedImages) await unlink(filename).catch(error => { if (error.code !== 'ENOENT') throw error })
    if (baseline) {
      assert.deepEqual(await getAllPages(productService), baseline.products)
      assert.deepEqual(await getAllPages(categoryService), baseline.categories)
      results.push({ name: 'original catalog is identical after cleanup', status: 'passed' })
    }
  } catch (error) { cleanupErrors.push(error.stack); process.exitCode = 1 }
  if (client) {
    await client.send('Fetch.disable').catch(() => {})
    await client.send('Browser.close').catch(() => {})
    client.close()
  }
  if (browser && browser.exitCode === null && browser.signalCode === null) await stopOwnedProcess(browser).catch(error => cleanupErrors.push(error.message))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  for (const filename of [uploadPath, replacementPath, invalidPath, corruptPath]) await unlink(filename).catch(error => { if (error.code !== 'ENOENT') cleanupErrors.push(error.message) })
  const report = { executed_at: new Date().toISOString(), target: { frontend: base, api: api.defaults.baseURL }, status: !failure && !cleanupErrors.length ? 'passed' : 'failed', results, screenshots, requests, responses, javascript_errors: errors, expected_interception_cancellations: expectedInterceptionCancellations, cleanup_errors: cleanupErrors, controlled_failures: ['CDP holds product GETs to observe loading.', 'CDP returns HTTP 503 only for the catalog error and failed DELETE scenarios.', 'A real temporary category is deleted after the form loads to provoke a real Django 400.', 'One original image URL is temporarily blocked in the browser to verify the local fallback.'], owned_images_removed: [...ownedImages].map(filename => path.basename(filename)) }
  await writeFile(path.join(runtime, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ status: report.status, passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => result.status === 'failed').length, screenshots: screenshots.length, cleanup_errors: cleanupErrors }))
  if (cleanupErrors.length) process.exitCode = 1
}
