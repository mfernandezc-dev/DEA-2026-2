import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectCdp } from '../../frontend/tests/helpers/cdpClient.mjs'

const lab = fileURLToPath(new URL('../../', import.meta.url))
const evidence = path.join(lab, 'evidencias', '01-backend')
const runtime = path.join(evidence, '.runtime')
const executable = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)
assert.ok(executable, 'Chrome or Edge is required for real screenshots.')
assert.ok(process.env.ADMIN_EVIDENCE_USERNAME && process.env.ADMIN_EVIDENCE_PASSWORD)
await mkdir(runtime, { recursive: true })
const profile = await mkdtemp(path.join(runtime, 'chrome-'))
let browser
let client

async function navigate(url, condition) {
  await client.send('Page.navigate', { url })
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
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  })
  const base = process.env.LAB13_BACKEND_URL || 'http://localhost:8000'
  await navigate(`${base}/admin/login/`, '!!document.querySelector("#id_username")')
  await client.evaluate(`(() => {
    document.querySelector('#id_username').value = ${JSON.stringify(process.env.ADMIN_EVIDENCE_USERNAME)};
    document.querySelector('#id_password').value = ${JSON.stringify(process.env.ADMIN_EVIDENCE_PASSWORD)};
    document.querySelector('#login-form').submit();
  })()`)
  await client.waitFor('!!document.querySelector("#logout-form")')
  await navigate(`${base}/admin/catalog/category/`, '!!document.querySelector("#result_list")')
  assert.equal(await client.evaluate('document.querySelectorAll("#result_list tbody tr").length'), 3)
  await client.screenshot(path.join(evidence, '03-admin-categories.png'))
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1250, deviceScaleFactor: 1, mobile: false,
  })
  await navigate(`${base}/admin/catalog/product/`, '!!document.querySelector("#result_list")')
  await client.waitFor('Array.from(document.querySelectorAll("#result_list img")).every(img => img.complete && img.naturalWidth > 0)')
  assert.equal(await client.evaluate('document.querySelectorAll("#result_list tbody tr").length'), 8)
  await client.screenshot(path.join(evidence, '04-admin-products.png'))
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  })
  const productURL = await client.evaluate('document.querySelector("#result_list tbody th a").href')
  await navigate(productURL, '!!document.querySelector(".field-image_preview img")')
  await client.waitFor('document.querySelector(".field-image_preview img").naturalWidth > 0')
  await client.screenshot(path.join(evidence, '05-product-image.png'))
  console.log('PASS real Chrome screenshots: categories (3), products (8), product image.')
} finally {
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
