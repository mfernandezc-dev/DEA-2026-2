import assert from 'node:assert/strict'
import rawMovies from '../src/data/movies.js'
import adaptMovie from '../src/adapters/movieAdapter.js'

export async function runUsePremieresChecks({ check, evaluate, send, waitFor, screenshot, url }) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  })
  await send('Page.navigate', { url: `${url}tests/fixtures/lab11Hooks.html` })
  await waitFor('Boolean(window.lab11Hooks)')

  await check('usePremieres: initial loading lasts 800 ms with one pending StrictMode request', async () => {
    await evaluate('window.lab11Hooks.mountPremieres()')
    const snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.deepEqual(snapshot.premieres, { status: 'loading', data: [], error: null })
    assert.equal(snapshot.pendingTimers, 1)
    assert.equal(snapshot.scheduledTimers, 2)
    assert.equal(snapshot.executedTimers, 0)
    assert.deepEqual(snapshot.remainingDelays, [800])
    await screenshot('13-lab11-premieres-loading.png', false)
  })

  await check('usePremieres: success returns four adapted local movies and completes only once', async () => {
    await evaluate('window.lab11Hooks.advance(799)')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().premieres.status'), 'loading')
    await evaluate('window.lab11Hooks.advance(1)')
    const snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(snapshot.premieres.status, 'success')
    assert.deepEqual(snapshot.premieres.data, rawMovies.slice(0, 4).map(adaptMovie))
    assert.equal(snapshot.premieres.error, null)
    assert.equal(snapshot.pendingTimers, 0)
    assert.equal(snapshot.executedTimers, 1)
    await screenshot('14-lab11-premieres-success.png', false)
  })

  await check('usePremieres: controlled failure provides an understandable error and no data', async () => {
    await evaluate('window.lab11Hooks.mountPremieres({ failAttempts: 1 }); window.lab11Hooks.advance(800)')
    const snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(snapshot.premieres.status, 'error')
    assert.deepEqual(snapshot.premieres.data, [])
    assert.equal(snapshot.premieres.error, 'No se pudieron cargar los estrenos. Inténtalo nuevamente.')
    assert.equal(snapshot.pendingTimers, 0)
    await screenshot('15-lab11-premieres-error.png', false)
  })

  await check('usePremieres: stable retry transitions error to loading to success', async () => {
    await evaluate('window.originalRetry = window.lab11Hooks.getRetry(); window.lab11Hooks.retry()')
    let snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.deepEqual(snapshot.premieres, { status: 'loading', data: [], error: null })
    assert.equal(snapshot.pendingTimers, 1)
    await evaluate('window.lab11Hooks.advance(800)')
    snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(snapshot.premieres.status, 'success')
    assert.deepEqual(snapshot.premieres.data, rawMovies.slice(0, 4).map(adaptMovie))
    assert.deepEqual(snapshot.premiereHistory.slice(-3), ['error', 'loading', 'success'])
    assert.equal(await evaluate('window.lab11Hooks.getRetry() === window.originalRetry'), true)
  })

  await check('usePremieres: equivalent options and rerenders do not restart or duplicate requests', async () => {
    await evaluate('window.lab11Hooks.mountPremieres({ delay: 100 }); window.lab11Hooks.advance(20); window.lab11Hooks.renderPremieres({ delay: 100 })')
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot().remainingDelays'), [80])
    await evaluate('window.lab11Hooks.advance(80)')
    const before = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(before.premieres.status, 'success')
    await evaluate('window.lab11Hooks.renderPremieres({ delay: 100 }); window.lab11Hooks.advance(1000)')
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot()'), before)
  })

  await check('usePremieres: unmount cancels timers and ignores even forced late callbacks', async () => {
    await evaluate('window.lab11Hooks.mountPremieres({ delay: 400 }); window.lab11Hooks.unmount()')
    const before = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(before.pendingTimers, 0)
    assert.equal(before.executedTimers, 0)
    await evaluate('window.lab11Hooks.advance(1000); window.lab11Hooks.flushCancelled()')
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot()'), before)
  })

  await check('usePremieres: changed options cancel stale attempts and retry recovers deterministically', async () => {
    await evaluate('window.lab11Hooks.mountPremieres({ delay: 500 }); window.lab11Hooks.advance(100); window.lab11Hooks.renderPremieres({ delay: 200, failAttempts: 1 })')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().pendingTimers'), 1)
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot().remainingDelays'), [200])
    await evaluate('window.lab11Hooks.flushCancelled(); window.lab11Hooks.advance(199)')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().premieres.status'), 'loading')
    await evaluate('window.lab11Hooks.advance(1)')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().premieres.status'), 'error')
    await evaluate('window.lab11Hooks.retry(); window.lab11Hooks.advance(200)')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().premieres.status'), 'success')
    assert.equal(await evaluate('window.lab11Hooks.snapshot().pendingTimers'), 0)
  })

  await evaluate('window.lab11Hooks.dispose()')
}
