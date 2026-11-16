import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanupBinding, cleanupProbeSource, createRequestAudit } from './helpers/requestAudit.mjs'

const baseURL = 'http://127.0.0.1:8000/api/'
const url = `${baseURL}exams/?page=1`
const component = 'http://localhost:5173/src/components/ExamList/ExamList.jsx'

function request(audit, id, options = {}) {
  audit.record({ method: 'Network.requestWillBeSent', params: {
    requestId: id, timestamp: id === 'old' ? 1 : 2, frameId: 'frame', loaderId: 'document',
    request: { method: 'GET', url, ...options },
    initiator: { stack: { callFrames: [
      { functionName: `lab12_xhr_123_${id === 'old' ? 1 : 2}`, url: component },
    ] } },
  } })
}

function cleanup(audit) {
  audit.record({ method: 'Runtime.bindingCalled', params: { name: cleanupBinding, payload: JSON.stringify({
    kind: 'effect-cleanup', marker: 'lab12_xhr_123_1', method: 'GET', url,
    stack: `${component}\ncommitHookEffectListUnmount`,
  }) } })
}

function fail(audit, options = {}) {
  audit.record({ method: 'Network.loadingFailed', params: {
    requestId: 'old', canceled: true, errorText: 'net::ERR_ABORTED', ...options,
  } })
}

function recover(audit) {
  request(audit, 'new')
  audit.record({ method: 'Network.responseReceived', params: { requestId: 'new', response: { status: 200, url } } })
  audit.record({ method: 'Network.loadingFinished', params: { requestId: 'new' } })
}

test('the injected cleanup probe is valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(cleanupProbeSource))
})

test('only proven ExamList cleanup with a completed subsequent GET is expected', () => {
  const audit = createRequestAudit(baseURL)
  request(audit, 'old')
  cleanup(audit)
  fail(audit)
  audit.refresh()
  assert.equal(audit.failedRequests.length, 1, 'No recovery yet: must still fail.')
  recover(audit)
  audit.refresh()
  assert.deepEqual(audit.failedRequests, [])
  assert.equal(audit.expectedCancellations[0].reason, 'proven ExamList effect cleanup')
})

test('a marked navigation must complete before authorizing cancellation', () => {
  const audit = createRequestAudit(baseURL)
  request(audit, 'old')
  audit.markNavigation()
  fail(audit)
  recover(audit)
  audit.refresh()
  assert.equal(audit.failedRequests.length, 1)
  audit.record({ method: 'Page.frameNavigated', params: { frame: { id: 'frame', loaderId: 'next-document' } } })
  audit.refresh()
  assert.deepEqual(audit.failedRequests, [])
  assert.equal(audit.expectedCancellations[0].reason, 'test-owned completed document navigation')
})

for (const [name, failure, requestOptions, proven] of [
  ['unproven ERR_ABORTED', {}, {}, false],
  ['non-canceled abort', { canceled: false }, {}, true],
  ['CORS', { corsErrorStatus: { corsError: 'MissingAllowOriginHeader' } }, {}, true],
  ['connection refused', { canceled: false, errorText: 'net::ERR_CONNECTION_REFUSED' }, {}, true],
  ['blocked request', { blockedReason: 'inspector' }, {}, true],
  ['another endpoint', {}, { url: `${baseURL}questions/` }, true],
  ['POST', {}, { method: 'POST' }, true],
]) {
  test(`${name} is not hidden by the cancellation filter`, () => {
    const audit = createRequestAudit(baseURL)
    request(audit, 'old', requestOptions)
    if (proven) cleanup(audit)
    fail(audit, failure)
    recover(audit)
    audit.refresh()
    assert.equal(audit.failedRequests.length, 1)
    assert.deepEqual(audit.expectedCancellations, [])
  })
}

test('HTTP failures remain visible even alongside a legitimate cancellation', () => {
  const audit = createRequestAudit(baseURL)
  request(audit, 'old')
  cleanup(audit)
  fail(audit)
  recover(audit)
  audit.record({ method: 'Network.responseReceived', params: { requestId: 'bad', response: { status: 503, url } } })
  audit.refresh()
  assert.equal(audit.expectedCancellations.length, 1)
  assert.deepEqual(audit.failedRequests, [`503 ${url}`])
})
