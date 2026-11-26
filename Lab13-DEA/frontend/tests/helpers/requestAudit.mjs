export const cleanupBinding = '__lab12CleanupProbe'

export const cleanupProbeSource = `(() => {
  Error.stackTraceLimit = Math.max(Error.stackTraceLimit || 10, 50);
  const records = new WeakMap();
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  const nativeAbort = XMLHttpRequest.prototype.abort;
  const controllerAbort = AbortController.prototype.abort;
  let sequence = 0;
  let cleanup = null;
  const documentId = String(performance.timeOrigin).replace(/\\D/g, '');
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    const result = nativeOpen.call(this, method, url, ...args);
    const marker = 'lab12_xhr_' + documentId + '_' + (++sequence);
    records.set(this, { marker, method: String(method).toUpperCase(), url: new URL(url, location.href).href });
    const trackedSend = function(...values) { return nativeSend.apply(this, values); };
    Object.defineProperty(trackedSend, 'name', { value: marker });
    this.send = trackedSend;
    return result;
  };
  AbortController.prototype.abort = function(...args) {
    const previous = cleanup;
    const stack = new Error().stack || '';
    cleanup = /\\/src\\/components\\/ExamList\\/ExamList\\.jsx/.test(stack) && /commitHookEffectListUnmount|commitPassiveUnmount|disconnectPassiveEffect|invokePassiveEffectUnmount/.test(stack)
      ? { kind: 'effect-cleanup', stack }
      : null;
    try { return controllerAbort.apply(this, args); }
    finally { cleanup = previous; }
  };
  XMLHttpRequest.prototype.abort = function(...args) {
    const record = records.get(this);
    if (cleanup && record && this.readyState !== XMLHttpRequest.DONE) {
      globalThis.${cleanupBinding}(JSON.stringify({ ...record, ...cleanup }));
    }
    return nativeAbort.apply(this, args);
  };
})()`

function stackFrames(stack) {
  return stack ? [...(stack.callFrames || []), ...stackFrames(stack.parent)] : []
}

export function createRequestAudit(baseURL) {
  const endpoint = new URL('exams/', baseURL)
  const requests = new Map()
  const failures = new Map()
  const httpErrors = new Map()
  const cleanups = []
  const navigations = new Map()
  const failedRequests = []
  const expectedCancellations = []

  function isExamRequest(request) {
    if (!request || request.method !== 'GET') return false
    const url = new URL(request.url)
    return url.origin === endpoint.origin && url.pathname === endpoint.pathname && request.fromExamList
  }

  const audit = {
    requests, failures, cleanups, failedRequests, expectedCancellations,
    markNavigation() {
      for (const [id, request] of requests) {
        if (isExamRequest(request) && !request.finished && !failures.has(id) && request.loaderId) {
          navigations.set(id, { frameId: request.frameId, loaderId: request.loaderId, completed: false })
        }
      }
    },
    record({ method, params }) {
      if (method === 'Network.requestWillBeSent') {
        const frames = stackFrames(params.initiator?.stack)
        const marker = frames.map((frame) => frame.functionName).find((name) => /^lab12_xhr_\d+_\d+$/.test(name))
        requests.set(params.requestId, {
          id: params.requestId, url: params.request.url, method: params.request.method,
          loaderId: params.loaderId, frameId: params.frameId, started: params.timestamp,
          marker, fromExamList: frames.some((frame) => frame.url?.includes('/src/components/ExamList/ExamList.jsx')),
        })
      } else if (method === 'Network.responseReceived') {
        const request = requests.get(params.requestId)
        if (request) request.status = params.response.status
        if (params.response.status >= 400) httpErrors.set(params.requestId, `${params.response.status} ${params.response.url}`)
      } else if (method === 'Network.loadingFinished') {
        const request = requests.get(params.requestId)
        if (request) request.finished = true
      } else if (method === 'Network.loadingFailed') {
        failures.set(params.requestId, { ...params })
      } else if (method === 'Page.frameNavigated' && !params.frame.parentId) {
        for (const navigation of navigations.values()) {
          if (navigation.frameId === params.frame.id && navigation.loaderId !== params.frame.loaderId) navigation.completed = true
        }
      } else if (method === 'Runtime.bindingCalled' && params.name === cleanupBinding) {
        try { cleanups.push(JSON.parse(params.payload)) } catch { /* Unproven events cannot authorize exclusions. */ }
      }
    },
    pendingExamCount() {
      return [...requests.values()].filter((request) => isExamRequest(request) && !request.finished && !failures.has(request.id)).length
    },
    refresh() {
      const unexpected = [...httpErrors.values()]
      const expected = []
      for (const [id, failure] of failures) {
        const request = requests.get(id)
        const proof = request?.marker && cleanups.find((cleanup) =>
          cleanup.kind === 'effect-cleanup' && cleanup.marker === request.marker && cleanup.url === request.url && cleanup.method === request.method &&
          /\/src\/components\/ExamList\/ExamList\.jsx/.test(cleanup.stack || '') && /commitHookEffectListUnmount|commitPassiveUnmount|disconnectPassiveEffect|invokePassiveEffectUnmount/.test(cleanup.stack || ''))
        const navigation = navigations.get(id)?.completed
        const recovered = request && [...requests.values()].some((next) =>
          next.id !== id && next.url === request.url && isExamRequest(next) && next.started > request.started && next.status === 200 && next.finished && !failures.has(next.id))
        if (isExamRequest(request) && failure.canceled === true && failure.errorText === 'net::ERR_ABORTED' && !failure.corsErrorStatus && !failure.blockedReason && (proof || navigation) && recovered) {
          expected.push({ requestId: id, url: request.url, error: failure.errorText, reason: proof ? 'proven ExamList effect cleanup' : 'test-owned completed document navigation', recovered: true })
        } else {
          unexpected.push({ requestId: id, url: request?.url, error: failure.errorText, canceled: failure.canceled, corsError: failure.corsErrorStatus })
        }
      }
      failedRequests.splice(0, failedRequests.length, ...unexpected)
      expectedCancellations.splice(0, expectedCancellations.length, ...expected)
    },
  }
  return audit
}
