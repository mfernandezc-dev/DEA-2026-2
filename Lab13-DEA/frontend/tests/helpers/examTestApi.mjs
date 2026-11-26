import { createServer } from 'node:http'

// This local HTTP fixture models the existing DRF contract, not the Django implementation.
export async function startExamTestApi({ allowLegacyTestOrigin = false } = {}) {
  const records = [1, 2].map((id) => ({ id, title: `Examen de referencia ${id}`, description: '', created_at: '2026-11-15T00:00:00Z' }))
  const requests = []
  let nextId = 3
  let failReads = false
  let failDeletes = false
  let emptyReads = false
  let baseURL
  const server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    requests.push({ method: request.method, path: request.url, body })
    // The inherited browser runner chooses a random loopback port; Django is never changed.
    const origin = request.headers.origin
    const allowedOrigin = allowLegacyTestOrigin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')
      ? origin
      : 'http://localhost:5173'
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'content-type')
    if (request.method === 'OPTIONS') {
      response.end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    const url = new URL(request.url, baseURL)
    function send(status, data) {
      response.writeHead(status)
      response.end(data === undefined ? undefined : JSON.stringify(data))
    }
    if (url.pathname === '/api/exams/' && request.method === 'GET') {
      if (failReads) return send(503, { detail: 'Temporary test failure.' })
      const page = Number(url.searchParams.get('page') || 1)
      const data = emptyReads ? [] : records
      const start = (page - 1) * 5
      if (page < 1 || (page > 1 && start >= data.length)) return send(404, { detail: 'Invalid page.' })
      return send(200, {
        count: data.length,
        next: start + 5 < data.length ? `${baseURL}exams/?page=${page + 1}` : null,
        previous: page > 1 ? `${baseURL}exams/?page=${page - 1}` : null,
        results: data.slice(start, start + 5),
      })
    }
    if (url.pathname === '/api/exams/' && request.method === 'POST') {
      const data = JSON.parse(body)
      if (!data.title.trim()) return send(400, { title: ['This field may not be blank.'] })
      const exam = { id: nextId++, title: data.title, description: data.description, created_at: new Date().toISOString() }
      records.push(exam)
      return send(201, exam)
    }
    const detail = url.pathname.match(/^\/api\/exams\/(\d+)\/$/)
    if (detail && request.method === 'DELETE') {
      if (failDeletes) return send(503, { detail: 'Temporary test failure.' })
      const index = records.findIndex((record) => record.id === Number(detail[1]))
      if (index === -1) return send(404, { detail: 'Not found.' })
      records.splice(index, 1)
      return send(204)
    }
    return send(501, { detail: 'Endpoint not modeled by this test fixture.' })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseURL = `http://127.0.0.1:${server.address().port}/api/`
  return {
    baseURL,
    requests,
    setReadFailure(value) { failReads = value },
    setDeleteFailure(value) { failDeletes = value },
    setEmptyReads(value) { emptyReads = value },
    async close() { await new Promise((resolve) => server.close(resolve)) },
  }
}
