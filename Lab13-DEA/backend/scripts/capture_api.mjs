import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectCdp } from '../../frontend/tests/helpers/cdpClient.mjs'
import api from '../../frontend/src/services/api.js'
import categoryService from '../../frontend/src/services/categoryService.js'
import productService from '../../frontend/src/services/productService.js'

const lab = fileURLToPath(new URL('../../', import.meta.url))
const evidence = path.join(lab, 'evidencias', '02-api-servicios')
const runtime = path.join(evidence, '.runtime')
const base = process.env.LAB13_BACKEND_URL || 'http://localhost:8000'
api.defaults.baseURL = `${base}/api/`
const executable = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
assert.ok(executable, 'Chrome or Edge is required for real screenshots.')
await mkdir(runtime, { recursive: true })
const profile = await mkdtemp(path.join(runtime, 'chrome-'))
const temporaryName = `Lab13 browser ${randomUUID()}`
let category
let browser
let client

async function navigate(url, condition) {
  await client.send('Page.navigate', { url })
  await client.waitFor(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`)
  await client.waitFor(condition)
}

try {
  browser = spawn(executable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })
  const portFile = path.join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt += 1) await delay(100)
  const port = (await readFile(portFile, 'utf8')).split('\n')[0].trim()
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  client = await connectCdp((await response.json()).webSocketDebuggerUrl)
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1350, deviceScaleFactor: 1, mobile: false,
  })
  await navigate(`${base}/api/categories/`, 'document.body.innerText.includes("Accessories") && document.body.innerText.includes("200 OK")')
  await client.screenshot(path.join(evidence, '01-api-categories.png'))
  await navigate(`${base}/api/products/`, 'document.body.innerText.includes("Lenovo IdeaPad") && document.body.innerText.includes("category")')
  await client.screenshot(path.join(evidence, '02-api-products-nested.png'))
  const product = (await productService.getAll()).results[0]
  await navigate(`${base}/api/products/${product.id}/`, 'document.body.innerText.includes("Lenovo IdeaPad") && document.body.innerText.includes("200 OK")')
  await client.screenshot(path.join(evidence, '03-api-product-detail.png'))
  await navigate(`${base}/api/categories/`, 'document.body.innerText.includes("Accessories")')
  await client.evaluate(`(() => {
    const form = document.createElement('form');
    form.method = 'POST'; form.action = ${JSON.stringify(`${base}/api/categories/`)};
    for (const [name, value] of Object.entries({name: ${JSON.stringify(temporaryName)}, description: 'Temporary record for a real creation screenshot.'})) {
      const input = document.createElement('input'); input.name = name; input.value = value;
      form.append(input);
    }
    document.body.append(form); form.submit();
  })()`)
  await client.waitFor(`document.body.innerText.includes('201 Created') && document.body.innerText.includes(${JSON.stringify(temporaryName)})`)
  category = (await categoryService.getAll()).results.find(item => item.name === temporaryName)
  assert.ok(category)
  await client.screenshot(path.join(evidence, '04-api-created-201.png'))
  await navigate(pathToFileURL(path.join(runtime, 'test-results.txt')).href, 'document.body.innerText.includes("django_tests") && document.body.innerText.includes("OK")')
  await client.screenshot(path.join(evidence, '05-test-results.png'))
  console.log('PASS 5 real Chrome screenshots: categories, nested list, detail, HTTP 201, actual test output.')
} finally {
  if (!category) {
    category = (await categoryService.getAll()).results.find(item => item.name === temporaryName)
  }
  if (category) await categoryService.remove(category.id)
  if (client) {
    await client.send('Browser.close').catch(() => {})
    client.close()
  }
  if (browser && browser.exitCode === null) {
    await Promise.race([
      new Promise(resolve => browser.once('exit', resolve)),
      delay(5000).then(() => { if (browser.exitCode === null) browser.kill() }),
    ])
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
