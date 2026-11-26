import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import api from '../src/services/api.js'
import categoryService from '../src/services/categoryService.js'
import productService from '../src/services/productService.js'

const lab = fileURLToPath(new URL('../../', import.meta.url))
const evidence = path.join(lab, 'evidencias', '02-api-servicios')
await mkdir(path.join(evidence, '.runtime'), { recursive: true })
api.defaults.baseURL = process.env.LAB13_API_BASE_URL || 'http://localhost:8000/api/'
const prefix = `Lab13 temporary ${randomUUID()}`
const results = []
const ownedImages = new Set()
let category
let product
let baseline
let failure

async function all(service) {
  const records = []
  for (let page = 1; page < 100; page += 1) {
    const data = await service.getAll({ page })
    records.push(...data.results)
    if (!data.next) return records.sort((a, b) => a.id - b.id)
  }
  throw new Error('Pagination did not terminate.')
}

async function check(name, callback) {
  await callback()
  results.push({ name, status: 'passed' })
  console.log(`PASS ${name}`)
}

function rememberImage(value) {
  const filename = decodeURIComponent(new URL(value.image).pathname)
  assert.ok(filename.startsWith('/media/catalog/products/'))
  assert.ok(path.basename(filename).startsWith('lab13-'))
  // Resolve the image below the local MEDIA_ROOT, never the source assets.
  ownedImages.add(path.join(lab, 'backend', 'media', filename.slice('/media/'.length)))
}

async function imageForm(filename) {
  const form = new FormData()
  form.append('image', new Blob([await readFile(path.join(lab, 'backend', 'catalog', 'assets', 'demo', 'lenovo-ideapad.png'))], { type: 'image/png' }), filename)
  return form
}

try {
  baseline = { categories: await all(categoryService), products: await all(productService) }
  await check('original catalog contains three categories and eight nested products', async () => {
    assert.equal(baseline.categories.length, 3)
    assert.equal(baseline.products.length, 8)
    for (const item of baseline.products) {
      assert.deepEqual(item.category, baseline.categories.find(value => value.id === item.category.id))
    }
    const firstPage = await productService.getAll()
    assert.equal(firstPage.results.length, 5)
    assert.equal(firstPage.count, 8)
  })
  await check('all original image URLs return real PNG content over localhost HTTP', async () => {
    for (const item of baseline.products) {
      const response = await fetch(item.image)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type'), /image\/png/)
      assert.ok((await response.arrayBuffer()).byteLength > 0)
    }
  })
  await check('categoryService.create/getById/update(PATCH and PUT) use real Django', async () => {
    category = await categoryService.create({ name: prefix, description: 'Temporary HTTP integration record.' })
    assert.equal((await categoryService.getById(category.id)).name, prefix)
    category = await categoryService.update(category.id, { description: 'Patched via Axios.' })
    assert.equal(category.description, 'Patched via Axios.')
    category = await categoryService.update(category.id, { name: prefix, description: 'Replaced via Axios.' }, { replace: true })
    assert.equal(category.description, 'Replaced via Axios.')
  })
  await check('productService.create sends a valid multipart image and category_id', async () => {
    const form = await imageForm(`lab13-${randomUUID()}.png`)
    for (const [key, value] of Object.entries({ name: prefix, description: 'Temporary product.', price: '123.45', stock: '3', category_id: String(category.id) })) form.append(key, value)
    product = await productService.create(form)
    rememberImage(product)
    assert.equal(product.category.id, category.id)
    assert.equal(product.category.description, category.description)
    assert.equal(product.price, '123.45')
    assert.equal((await productService.getById(product.id)).name, prefix)
  })
  await check('productService.update supports JSON PATCH/PUT without another image', async () => {
    const image = product.image
    product = await productService.update(product.id, { stock: 9 })
    assert.equal(product.stock, 9)
    assert.equal(product.image, image)
    product = await productService.update(product.id, { name: prefix, description: 'Updated without image.', price: '125.00', stock: 8, category_id: category.id }, { replace: true })
    assert.equal(product.price, '125.00')
    assert.equal(product.image, image)
  })
  await check('multipart PATCH replaces an image without mutating FormData', async () => {
    const image = product.image
    const form = await imageForm(`lab13-${randomUUID()}.png`)
    const entries = [...form.entries()]
    product = await productService.update(product.id, form)
    rememberImage(product)
    assert.notEqual(product.image, image)
    assert.deepEqual([...form.entries()], entries)
  })
  await check('real validation errors reject negative price/stock, missing category and invalid image', async () => {
    for (const payload of [{ price: '-1.00' }, { stock: -1 }, { category_id: 999999 }]) {
      await assert.rejects(productService.update(product.id, payload), error => error.response?.status === 400 && Object.keys(payload).every(key => key in error.response.data))
    }
    const form = new FormData()
    form.append('image', new Blob(['invalid'], { type: 'image/png' }), 'invalid.png')
    await assert.rejects(productService.update(product.id, form), error => error.response?.status === 400 && !!error.response.data.image)
  })
  await check('protected category returns 409 through the real service', async () => {
    await assert.rejects(categoryService.remove(category.id), error => error.response?.status === 409 && !!error.response.data.detail)
  })
  await check('productService.remove returns undefined and the deleted resource returns 404', async () => {
    const id = product.id
    assert.equal(await productService.remove(id), undefined)
    product = null
    await assert.rejects(productService.getById(id), error => error.response?.status === 404)
  })
  await check('categoryService.remove returns undefined and the deleted resource returns 404', async () => {
    const id = category.id
    assert.equal(await categoryService.remove(id), undefined)
    category = null
    await assert.rejects(categoryService.getById(id), error => error.response?.status === 404)
  })
} catch (error) {
  failure = error
  results.push({ name: 'HTTP integration', status: 'failed', error: error.message })
  process.exitCode = 1
} finally {
  const cleanupErrors = []
  if (product) await productService.remove(product.id).catch(error => cleanupErrors.push(error.message))
  if (category) await categoryService.remove(category.id).catch(error => cleanupErrors.push(error.message))
  for (const filename of ownedImages) await unlink(filename).catch(error => { if (error.code !== 'ENOENT') cleanupErrors.push(error.message) })
  if (baseline) {
    try {
      assert.deepEqual(await all(categoryService), baseline.categories)
      assert.deepEqual(await all(productService), baseline.products)
      results.push({ name: 'original categories and products are unchanged after cleanup', status: 'passed' })
    } catch (error) { cleanupErrors.push(error.message) }
  }
  if (cleanupErrors.length) process.exitCode = 1
  await writeFile(path.join(evidence, '.runtime', 'http.json'), JSON.stringify({
    executed_at: new Date().toISOString(), target: api.defaults.baseURL,
    results, cleanup_errors: cleanupErrors,
    sample_product: baseline?.products[0],
    status: !failure && cleanupErrors.length === 0 ? 'passed' : 'failed',
  }, null, 2) + '\n')
  if (failure) console.error(failure.message)
  if (cleanupErrors.length) console.error(cleanupErrors)
}
