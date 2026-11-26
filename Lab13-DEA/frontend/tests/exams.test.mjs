import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import api, { isRequestCanceled } from '../src/api/client.js'
import { createExam, deleteExam, getExamErrorMessage, getExams, getExamValidationErrors } from '../src/api/exams.js'

let server
const requests = []
const originalBaseURL = api.defaults.baseURL

before(async () => {
  server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    requests.push({ method: request.method, url: request.url, body, contentType: request.headers['content-type'] })
    response.setHeader('Content-Type', 'application/json')
    if (request.method === 'GET') {
      if (request.url.includes('page=99')) {
        response.end(JSON.stringify({ invalid: true }))
      } else {
        response.end(JSON.stringify({ count: 1, next: null, previous: null, results: [{ id: 123, title: 'Examen de prueba', description: '', created_at: '2026-11-15T00:00:00Z' }] }))
      }
    } else if (request.method === 'POST') {
      const data = JSON.parse(body)
      if (!data.title) {
        response.writeHead(400)
        response.end(JSON.stringify({ title: ['This field may not be blank.'] }))
      } else {
        response.writeHead(201)
        response.end(JSON.stringify({ ...data, id: 123, created_at: '2026-11-15T00:00:00Z' }))
      }
    } else if (request.method === 'DELETE') {
      response.writeHead(204)
      response.end()
    } else {
      response.writeHead(501)
      response.end('{}')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  api.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api/`
})

after(async () => {
  api.defaults.baseURL = originalBaseURL
  if (server) await new Promise((resolve) => server.close(resolve))
})

test('GET uses Axios, a trailing slash, page parameters and the DRF results envelope over real HTTP', async () => {
  const data = await getExams(2)
  assert.equal(data.count, 1)
  assert.equal(data.results[0].id, 123)
  assert.equal(requests.at(-1).url, '/api/exams/?page=2')
  assert.equal(requests.at(-1).method, 'GET')
})

test('POST sends only the controlled writable fields as JSON', async () => {
  const exam = await createExam({ title: 'Prueba', description: 'Descripción', id: 999 })
  assert.equal(exam.id, 123)
  assert.deepEqual(JSON.parse(requests.at(-1).body), { title: 'Prueba', description: 'Descripción' })
  assert.equal(requests.at(-1).url, '/api/exams/')
  assert.match(requests.at(-1).contentType, /application\/json/)
})

test('empty titles reach the HTTP server and returned field errors are displayed in Spanish', async () => {
  await assert.rejects(createExam({ title: '', description: '' }), (error) => {
    assert.equal(error.response.status, 400)
    assert.deepEqual(getExamValidationErrors(error), { title: ['Este campo no puede estar vacío.'] })
    return true
  })
})

test('DELETE accepts HTTP 204 without attempting to read a JSON body', async () => {
  assert.equal(await deleteExam(123), undefined)
  assert.equal(requests.at(-1).method, 'DELETE')
  assert.equal(requests.at(-1).url, '/api/exams/123/')
  assert.equal(requests.at(-1).body, '')
})

test('invalid pagination is rejected rather than silently showing missing data', async () => {
  await assert.rejects(getExams(99), /Invalid paginated exam response/)
})

test('canceled requests are distinguishable from loading failures', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(getExams(1, { signal: controller.signal }), isRequestCanceled)
})

test('DRF required, null and maximum-length errors retain their meaning in Spanish', () => {
  assert.deepEqual(getExamValidationErrors({ response: { status: 400, data: {
    title: ['This field is required.', 'This field may not be null.', 'Ensure this field has no more than 200 characters.'],
    description: ['Not a valid string.'],
    non_field_errors: ['Unknown validation message.'],
  } } }), {
    title: ['Este campo es obligatorio.', 'Este campo no puede ser nulo.', 'Este campo no puede tener más de 200 caracteres.'],
    description: ['Introduce un texto válido.'],
    non_field_errors: ['El servidor rechazó este valor. Revisa el campo e inténtalo de nuevo.'],
  })
  assert.deepEqual(getExamValidationErrors({ response: { status: 500 } }), {})
})

test('connection, timeout and server failures have understandable messages', () => {
  assert.match(getExamErrorMessage({ isAxiosError: true }, 'Error'), /No se pudo conectar con Django/)
  assert.match(getExamErrorMessage({ code: 'ECONNABORTED' }, 'Error'), /tardó demasiado/)
  assert.equal(getExamErrorMessage({ response: { status: 500 } }, 'No se pudieron cargar los exámenes.'), 'No se pudieron cargar los exámenes.')
})
