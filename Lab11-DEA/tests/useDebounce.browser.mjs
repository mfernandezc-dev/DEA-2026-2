import assert from 'node:assert/strict'

export async function runUseDebounceChecks({ check, evaluate, send, waitFor, url }) {
  await send('Page.navigate', { url: `${url}tests/fixtures/useDebounce.html` })
  await waitFor('Boolean(window.debounceHarness)')

  await check('useDebounce: initial and unchanged values do not schedule unnecessary updates', async () => {
    await evaluate('window.debounceHarness.reset("initial", 400)')
    const before = await evaluate('window.debounceHarness.snapshot()')
    assert.equal(before.value, 'initial')
    assert.equal(before.pendingCount, 0)
    await evaluate('window.debounceHarness.render("initial", 400); window.debounceHarness.advance(1000)')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot()'), before)
  })

  await check('useDebounce: default delay is exactly 400 ms and identical rerenders do not restart it', async () => {
    await evaluate('window.debounceHarness.reset("initial"); window.debounceHarness.render("updated")')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot().remainingDelays'), [400])
    await evaluate('window.debounceHarness.advance(100); window.debounceHarness.render("updated")')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot().remainingDelays'), [300])
    await evaluate('window.debounceHarness.advance(299)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 'initial')
    await evaluate('window.debounceHarness.advance(1)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 'updated')
    assert.equal(await evaluate('window.debounceHarness.snapshot().pendingCount'), 0)
  })

  await check('useDebounce: rapid values cancel previous timers and publish only the final value', async () => {
    await evaluate('window.debounceHarness.reset("", 400)')
    const initialCount = await evaluate('window.debounceHarness.snapshot().updates.length')
    await evaluate(`
      window.debounceHarness.render('f', 400)
      window.debounceHarness.advance(25)
      window.debounceHarness.render('fa', 400)
      window.debounceHarness.advance(25)
      window.debounceHarness.render('faro', 400)
      window.debounceHarness.advance(399)
    `)
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), '')
    assert.equal(await evaluate('window.debounceHarness.snapshot().pendingCount'), 1)
    await evaluate('window.debounceHarness.advance(1)')
    assert.deepEqual(await evaluate(`window.debounceHarness.snapshot().updates.slice(${initialCount})`), ['faro'])
  })

  await check('useDebounce: configurable delays, changed delays and zero delay are respected', async () => {
    await evaluate('window.debounceHarness.reset(0, 500); window.debounceHarness.render(1, 500); window.debounceHarness.advance(200); window.debounceHarness.render(1, 100)')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot().remainingDelays'), [100])
    await evaluate('window.debounceHarness.advance(99)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 0)
    await evaluate('window.debounceHarness.advance(1)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 1)
    await evaluate('window.debounceHarness.render(2, 0)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 1)
    await evaluate('window.debounceHarness.advance(0)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value'), 2)
  })

  await check('useDebounce: returning to the published value cancels a pending change', async () => {
    await evaluate('window.debounceHarness.reset("", 400); window.debounceHarness.render("stale", 400); window.debounceHarness.advance(100); window.debounceHarness.render("", 400)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().pendingCount'), 0)
    const before = await evaluate('window.debounceHarness.snapshot()')
    await evaluate('window.debounceHarness.advance(1000)')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot()'), before)
  })

  await check('useDebounce: non-string values retain their original identity', async () => {
    await evaluate('window.initialHookValue = { title: "initial" }; window.nextHookValue = { title: "next" }; window.debounceHarness.reset(window.initialHookValue, 50); window.debounceHarness.render(window.nextHookValue, 50)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value === window.initialHookValue'), true)
    await evaluate('window.debounceHarness.advance(50)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().value === window.nextHookValue'), true)
  })

  await check('useDebounce: unmount clears pending timers under StrictMode', async () => {
    await evaluate('window.debounceHarness.reset("initial", 400); window.debounceHarness.render("pending", 400)')
    assert.equal(await evaluate('window.debounceHarness.snapshot().pendingCount'), 1)
    await evaluate('window.debounceHarness.unmount()')
    const before = await evaluate('window.debounceHarness.snapshot()')
    assert.equal(before.pendingCount, 0)
    await evaluate('window.debounceHarness.advance(1000)')
    assert.deepEqual(await evaluate('window.debounceHarness.snapshot()'), before)
  })

  await evaluate('window.debounceHarness.dispose()')
}
