import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { getAllPages } from '../src/services/getAllPages.js'
import { filterProducts, imageFileError, normalizeText, pen, productFormData, productServerErrors, validateProduct } from '../src/utils/catalog.js'

const values = { name: ' Temporary ', description: ' Description ', price: '10.25', stock: '0', category_id: '2' }
const file = new File(['test bytes'], 'product.png', { type: 'image/png' })
const products = [{ id: 1, name: 'Portátil', description: 'Para estudiar', category: { id: 2 } }, { id: 2, name: 'Monitor', description: 'Panel portátil', category: { id: 3 } }]

test('PEN prices use the es-PE currency formatter', () => {
  assert.match(pen.format(2299.9), /S\//)
  assert.equal(pen.resolvedOptions().currency, 'PEN')
  assert.equal(pen.resolvedOptions().locale, 'es-PE')
})
test('local search normalizes accents, case and surrounding whitespace', () => {
  assert.equal(normalizeText(' PORTÁTIL '), 'portatil')
  assert.equal(filterProducts(products, '', ' portatil ').length, 2)
})
test('category ID filtering combines with name and description search without mutation', () => {
  assert.deepEqual(filterProducts(products, '3', 'portatil'), [products[1]])
  assert.deepEqual(filterProducts(products, '2', 'Monitor'), [])
  assert.deepEqual(filterProducts(products, '', ''), products)
  assert.equal(products.length, 2)
})
test('all DRF pages are aggregated with the same cancellation signal', async () => {
  const calls = []
  const signal = new AbortController().signal
  const service = { async getAll(params, config) {
    calls.push([params.page, config.signal])
    return { count: 8, next: params.page === 1 ? '?page=2' : null, results: Array.from({ length: params.page === 1 ? 5 : 3 }, (_, i) => ({ id: i + (params.page === 1 ? 1 : 6) })) }
  } }
  assert.equal((await getAllPages(service, { signal })).length, 8)
  assert.deepEqual(calls, [[1, signal], [2, signal]])
})
test('empty pagination returns an empty list', async () => {
  assert.deepEqual(await getAllPages({ getAll: async () => ({ count: 0, next: null, results: [] }) }), [])
})
for (const [name, data] of [
  ['invalid envelope', { results: [] }],
  ['incomplete pagination', { count: 2, next: null, results: [{ id: 1 }] }],
  ['no progress', { count: 1, next: '?page=2', results: [] }],
  ['repeated records', { count: 2, next: '?page=2', results: [{ id: 1 }] }],
]) test(`pagination rejects ${name}`, async () => {
  await assert.rejects(getAllPages({ getAll: async () => data }))
})
test('pagination propagates the original service error', async () => {
  const error = new Error('Network failed')
  await assert.rejects(getAllPages({ getAll: async () => { throw error } }), value => value === error)
})
test('creation requires all fields and a file while editing can retain the image', () => {
  assert.deepEqual(Object.keys(validateProduct({ name: '', description: '', price: '', stock: '', category_id: '' }, null, false)).sort(), ['category_id', 'description', 'image', 'name', 'price', 'stock'])
  assert.deepEqual(validateProduct(values, file, false), {})
  assert.deepEqual(validateProduct(values, null, true), {})
})
test('price, stock, precision and range rules reject invalid inputs', () => {
  for (const price of ['-1', '1.234', 'NaN', '100000000', '1e3']) assert.ok(validateProduct({ ...values, price }, null, true).price)
  for (const stock of ['-1', '0.5', 'NaN', '2147483648']) assert.ok(validateProduct({ ...values, stock }, null, true).stock)
  assert.deepEqual(validateProduct({ ...values, price: '0', stock: '0' }, null, true), {})
})
test('image metadata rejects unsupported, empty and oversized files', () => {
  assert.ok(imageFileError({ type: 'text/plain', size: 10 }))
  assert.ok(imageFileError({ type: 'image/png', size: 0 }))
  assert.ok(imageFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }))
  assert.equal(imageFileError(file), '')
})
test('FormData uses category_id, trims copies and omits unchanged images', () => {
  const input = Object.freeze({ ...values })
  const data = productFormData(input, file)
  assert.equal(data.get('category_id'), '2')
  assert.equal(data.get('name'), 'Temporary')
  assert.equal(data.get('image'), file)
  assert.equal(input.name, ' Temporary ')
  assert.equal(productFormData(input, null).has('image'), false)
})
test('server validation messages remain field-addressable and are shown in Spanish', () => {
  const result = productServerErrors({ response: { status: 400, data: { name: ['This field is required.'], category_id: ['Invalid pk.'], image: ['Upload a valid image. The file you uploaded was either not an image or a corrupted image.'] } } })
  assert.match(result.name, /obligatorio/)
  assert.match(result.category_id, /categoría/)
  assert.match(result.image, /servidor rechazó/)
  assert.deepEqual(productServerErrors({ response: { status: 404 } }), {})
})
test('all UI layers use services instead of Axios, fetch or full-page reloads', async () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url))
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(filename)
      else if (/\.(jsx|js)$/.test(entry.name) && !filename.includes(`${path.sep}services${path.sep}`)) {
        assert.doesNotMatch(await readFile(filename, 'utf8'), /from ['"]axios['"]|\baxios\.|\bfetch\s*\(|window\.location\.reload\s*\(/, filename)
      }
    }
  }
  await visit(root)
})
