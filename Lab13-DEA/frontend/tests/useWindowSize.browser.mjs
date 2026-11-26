import assert from 'node:assert/strict'

export async function runWindowLayoutChecks({ check, evaluate, send, waitFor, screenshot, typeSearch, click, favoriteSelector, storedFavorites }) {
  const layouts = [[1440, 4], [1200, 4], [1199, 3], [900, 3], [899, 2], [600, 2], [599, 1], [390, 1], [320, 1]]
  const evidenceWidths = new Set([1440, 1200, 900, 600, 390, 320])

  for (const [width, columns] of layouts) {
    await check(`useWindowSize layout: ${width}px shows ${columns} columns without overflow`, async () => {
      await send('Emulation.setDeviceMetricsOverride', {
        width, height: 1000, deviceScaleFactor: 1, mobile: width < 600,
      })
      await waitFor(`document.querySelector('.movie-grid').style.getPropertyValue('--movie-columns') === '${columns}'`)
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".movie-grid")).gridTemplateColumns.split(" ").length'), columns)
      assert.equal(await evaluate(`(() => {
        const cards = [...document.querySelectorAll('.movie-card')]
        const firstTop = cards[0].getBoundingClientRect().top
        return cards.filter(card => Math.abs(card.getBoundingClientRect().top - firstTop) < 1).length
      })()`), columns)
      assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
      assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('.movie-card')).every(card => {
        const rect = card.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= window.innerWidth
      })`), true)
      if (evidenceWidths.has(width)) await screenshot(`12-lab11-grid-${width}.png`)
    })
  }

  await check('useWindowSize layout: search, notifications and persistent favorites survive resizing', async () => {
    const before = await storedFavorites()
    assert.equal(before.includes('last-lighthouse'), false)
    await typeSearch('faro')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1200, height: 1000, deviceScaleFactor: 1, mobile: false,
    })
    await waitFor('document.querySelector(".movie-grid").style.getPropertyValue("--movie-columns") === "4"')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    await click(favoriteSelector('last-lighthouse'))
    await waitFor('document.querySelector(".favorite-button").getAttribute("aria-pressed") === "true"')
    await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película agregada a favoritos"')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    })
    await typeSearch('')
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    assert.deepEqual(await storedFavorites(), [...before, 'last-lighthouse'])
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), before.length + 1)
    assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
    await evaluate('window.__resizeReloadToken = true')
    await send('Page.reload', { ignoreCache: true })
    await waitFor(`typeof window.__resizeReloadToken === 'undefined' && document.querySelectorAll('.movie-card').length === 8 && document.querySelectorAll('.favorite-button[aria-pressed=true]').length === ${before.length + 1}`)
    assert.deepEqual(await storedFavorites(), [...before, 'last-lighthouse'])
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), before.length + 1)
  })
}

export async function runUseWindowSizeChecks({ check, evaluate, send, waitFor, url }) {
  await send('Page.navigate', { url: `${url}tests/fixtures/lab11Hooks.html` })
  await waitFor('Boolean(window.lab11Hooks)')

  await check('useWindowSize: initial dimensions and one active listener under StrictMode', async () => {
    await evaluate('window.lab11Hooks.mountSize(1440, 1000)')
    const snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.deepEqual(snapshot.size, { width: 1440, height: 1000 })
    assert.equal(snapshot.activeResizeListeners, 1)
    assert.equal(snapshot.resizeRegistrations, 2)
    assert.equal(snapshot.resizeRemovals, 1)
  })

  await check('useWindowSize: resize updates both width and height without adding listeners', async () => {
    await evaluate('window.lab11Hooks.resize(390, 844)')
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot().size'), { width: 390, height: 844 })
    await evaluate('window.lab11Hooks.resize(390, 900)')
    const snapshot = await evaluate('window.lab11Hooks.snapshot()')
    assert.deepEqual(snapshot.size, { width: 390, height: 900 })
    assert.equal(snapshot.activeResizeListeners, 1)
    assert.equal(snapshot.resizeRegistrations, 2)
  })

  await check('useWindowSize: unchanged dimensions preserve state identity and avoid commits', async () => {
    await evaluate('window.originalSize = window.lab11Hooks.getSize()')
    const before = await evaluate('window.lab11Hooks.snapshot()')
    await evaluate('window.lab11Hooks.resize(390, 900)')
    assert.equal(await evaluate('window.lab11Hooks.getSize() === window.originalSize'), true)
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot()'), before)
  })

  await check('useWindowSize: unmount removes the listener and stops subsequent updates', async () => {
    await evaluate('window.lab11Hooks.unmount()')
    const before = await evaluate('window.lab11Hooks.snapshot()')
    assert.equal(before.activeResizeListeners, 0)
    assert.equal(before.resizeRemovals, before.resizeRegistrations)
    await evaluate('window.lab11Hooks.resize(600, 800)')
    assert.deepEqual(await evaluate('window.lab11Hooks.snapshot()'), before)
  })

  await check('useWindowSize: repeated StrictMode mounts do not accumulate listeners', async () => {
    for (const width of [600, 900, 1200]) {
      await evaluate(`window.lab11Hooks.mountSize(${width}, 1000)`)
      assert.equal(await evaluate('window.lab11Hooks.snapshot().activeResizeListeners'), 1)
      await evaluate('window.lab11Hooks.unmount()')
      assert.equal(await evaluate('window.lab11Hooks.snapshot().activeResizeListeners'), 0)
    }
  })

  await evaluate('window.lab11Hooks.dispose()')
}
