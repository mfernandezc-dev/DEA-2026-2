import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import api, { getApiErrorMessage, isRequestCanceled } from '../src/services/api.js'
import legacyApi from '../src/api/client.js'
import productService from '../src/services/productService.js'
import categoryService from '../src/services/categoryService.js'

let server
const requests = []
const originalBaseURL = api.defaults.baseURL

before(async () => {
  server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString()
    requests.push({ method: request.method, url: request.url, body, headers: request.headers })
    response.setHeader('Content-Type', 'application/json')
    const id = request.url.match(/\/(\d+)\//)?.[1]
    const status = id === '404' ? 404 : id === '409' ? 409 : id === '400' ? 400 : 200
    if (status !== 200) {
      response.writeHead(status)
      response.end(JSON.stringify(status === 400 ? { price: ['Ensure this value is greater than or equal to 0.'] } : { detail: 'Test API error.' }))
    } else if (request.method === 'DELETE') {
      response.writeHead(204)
      response.end()
    } else if (request.method === 'GET') {
      response.end(JSON.stringify(id ? { id: Number(id), name: 'Test' } : { count: 1, next: null, previous: null, results: [{ id: 7, name: 'Test' }] }))
    } else {
      response.writeHead(request.method === 'POST' ? 201 : 200)
      response.end(JSON.stringify({ id: 7, received: true }))
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api/`
})

after(async () => {
  api.defaults.baseURL = originalBaseURL
  if (server) await new Promise(resolve => server.close(resolve))
})

test('legacy and catalog imports use exactly the same Axios instance', () => {
  assert.equal(api, legacyApi)
  assert.equal(api.defaults.timeout, 10000)
  assert.equal(api.defaults.headers.Accept, 'application/json')
  assert.equal(api.defaults.headers.common['Content-Type'], undefined)
  assert.equal(originalBaseURL, 'http://127.0.0.1:8000/api/')
})

for (const [resource, service] of [['products', productService], ['categories', categoryService]]) {
  test(`${resource}.getAll returns the DRF envelope and forwards pagination without mutation`, async () => {
    const params = Object.freeze({ page: 2 })
    const result = await service.getAll(params)
    assert.equal(result.count, 1)
    assert.equal(result.results[0].id, 7)
    assert.equal(requests.at(-1).url, `/api/${resource}/?page=2`)
    assert.equal(requests.at(-1).method, 'GET')
    assert.equal(requests.at(-1).headers.accept, 'application/json')
    assert.deepEqual(params, { page: 2 })
  })
  test(`${resource}.getById requests the detail route`, async () => {
    assert.equal((await service.getById(7)).id, 7)
    assert.equal(requests.at(-1).url, `/api/${resource}/7/`)
    assert.equal(requests.at(-1).method, 'GET')
  })
  test(`${resource}.create sends JSON without changing the input`, async () => {
    const payload = Object.freeze({ name: 'Temporary', description: 'Test' })
    assert.equal((await service.create(payload)).id, 7)
    const request = requests.at(-1)
    assert.equal(request.url, `/api/${resource}/`)
    assert.equal(request.method, 'POST')
    assert.deepEqual(JSON.parse(request.body), payload)
    assert.match(request.headers['content-type'], /application\/json/)
  })
  test(`${resource}.update defaults to PATCH and supports explicit PUT`, async () => {
    const payload = Object.freeze({ name: 'Updated' })
    assert.equal((await service.update(7, payload)).received, true)
    assert.equal(requests.at(-1).method, 'PATCH')
    assert.equal(requests.at(-1).url, `/api/${resource}/7/`)
    assert.deepEqual(JSON.parse(requests.at(-1).body), payload)
    const config = Object.freeze({ replace: true })
    await service.update(7, payload, config)
    assert.equal(requests.at(-1).method, 'PUT')
    assert.deepEqual(config, { replace: true })
  })
  test(`${resource}.remove handles HTTP 204 as undefined`, async () => {
    assert.equal(await service.remove(7), undefined)
    assert.equal(requests.at(-1).method, 'DELETE')
    assert.equal(requests.at(-1).url, `/api/${resource}/7/`)
  })
  test(`${resource} preserves validation, not-found and conflict errors`, async () => {
    for (const status of [400, 404, 409]) {
      await assert.rejects(service.update(status, { price: '-1.00' }), error => {
        assert.equal(error.isAxiosError, true)
        assert.equal(error.response.status, status)
        if (status === 400) assert.ok(error.response.data.price)
        return true
      })
    }
  })
}

test('product creation and update preserve FormData and let Axios set multipart boundaries', async () => {
  const form = new FormData()
  form.append('name', 'Temporary upload')
  form.append('category_id', '1')
  form.append('image', new Blob(['test image bytes'], { type: 'image/png' }), 'product.png')
  const before = [...form.entries()]
  for (const send of [() => productService.create(form), () => productService.update(7, form)]) {
    await send()
    const request = requests.at(-1)
    assert.match(request.headers['content-type'], /multipart\/form-data; boundary=.+/)
    assert.match(request.body, /name="category_id"\r\n\r\n1/)
    assert.match(request.body, /filename="product.png"/)
    assert.deepEqual([...form.entries()], before)
  }
})

test('the centralized client preserves cancellation, timeout and connection error details', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(productService.getAll({}, { signal: controller.signal }), isRequestCanceled)
  assert.match(getApiErrorMessage({ code: 'ECONNABORTED' }), /tardó demasiado/)
  assert.match(getApiErrorMessage({ isAxiosError: true }), /conectar/)
  assert.equal(getApiErrorMessage({ response: { data: { detail: 'Protected.' } } }), 'Protected.')
  assert.equal(getApiErrorMessage({}, 'Fallback'), 'Fallback')
})

test('Vite environment configuration normalizes the base URL', async () => {
  const { createServer: createViteServer } = await import('vite')
  const previous = process.env.VITE_API_BASE_URL
  process.env.VITE_API_BASE_URL = 'http://localhost:8123/api///'
  let vite
  try {
    vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })
    const module = await vite.ssrLoadModule('/src/services/api.js')
    assert.equal(module.default.defaults.baseURL, 'http://localhost:8123/api/')
  } finally {
    if (previous === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previous
    if (vite) await vite.close()
  }
})

test('only services/api.js imports Axios or creates an instance; components have no direct HTTP calls', async () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url))
  const sources = []
  async function visit(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name)
      if (item.isDirectory()) await visit(filename)
      else if (/\.(js|jsx)$/.test(item.name)) sources.push([path.relative(root, filename).replaceAll('\\', '/'), await readFile(filename, 'utf8')])
    }
  }
  await visit(root)
  assert.deepEqual(sources.filter(([, text]) => /from ['"]axios['"]|axios\.create\(/.test(text)).map(([name]) => name), ['services/api.js'])
  for (const [filename, text] of sources.filter(([name]) => name.startsWith('components/'))) {
    assert.doesNotMatch(text, /\baxios\b|\bfetch\s*\(|https?:\/\/[^'"\s]*\/api\//, filename)
  }
})
