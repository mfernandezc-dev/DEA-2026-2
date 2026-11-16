import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

async function expectCount(evaluate, waitFor, count) {
  await waitFor(`document.querySelector('.favorite-count span')?.textContent === '${count}'`)
  assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), count)
}

async function expectRestored(evaluate, waitFor) {
  await waitFor('document.querySelector("#movie-search").value === "" && document.querySelectorAll("#cartelera .movie-card").length === 8')
  assert.equal(await evaluate('document.querySelectorAll("#cartelera .showtime").length'), 24)
  assert.match(await evaluate('document.querySelector(".movie-count").textContent'), /^8 películas/)
  assert.equal(await evaluate('document.querySelectorAll(".empty-state").length'), 0)
}

async function pressKey(send, key, code, windowsVirtualKeyCode) {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key, code, windowsVirtualKeyCode,
    ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
  })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
}

export async function runInitialFavoriteCountCheck({ check, evaluate, waitFor, screenshot }) {
  await check('Activity 9: Header initially displays zero and receives only the derived numeric count', async () => {
    const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
    const headerSource = await readFile(new URL('../src/components/Header/Header.jsx', import.meta.url), 'utf8')
    assert.match(appSource, /const favoriteCount\s*=\s*favoriteIds\.length/)
    const headerUsages = [...appSource.matchAll(/<Header\b([^>]*?)\/>/g)]
    assert.equal(headerUsages.length, 1)
    assert.match(headerUsages[0][1].trim(), /^favoriteCount=\{favoriteCount\}$/)
    assert.match(headerSource, /function Header\(\{\s*favoriteCount\s*\}\)/)
    assert.doesNotMatch(headerSource, /favoriteIds|useState|localStorage/)
    await expectCount(evaluate, waitFor, 0)
    assert.equal(await evaluate('document.querySelector(".favorite-count").getAttribute("aria-live")'), 'polite')
    assert.equal(await evaluate('document.querySelector(".favorite-count").getAttribute("aria-atomic")'), 'true')
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".main-nav a"), link => link.getAttribute("href"))'), ['#inicio', '#cartelera', '#contacto'])
    await screenshot('22-lab11-favorite-count-zero.png', false)
  })
}

export async function runSharedStateChecks({ check, evaluate, send, waitFor, screenshot, click, typeSearch, storedFavorites, favoriteSelector, reloadPage, consoleMessages }) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await waitFor('document.querySelector(".movie-grid").style.getPropertyValue("--movie-columns") === "4"')

  await check('Activity 9: multiple cards update the sibling Header without duplicated favorite IDs', async () => {
    for (const id of await storedFavorites()) {
      await click(favoriteSelector(id))
    }
    await expectCount(evaluate, waitFor, 0)
    for (const [index, id] of ['lost-orbit', 'last-lighthouse', 'neon-city'].entries()) {
      await click(favoriteSelector(id))
      await expectCount(evaluate, waitFor, index + 1)
      await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película agregada a favoritos"')
      assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    }
    const ids = await storedFavorites()
    assert.equal(new Set(ids).size, 3)
    assert.equal(ids.length, 3)
    await screenshot('23-lab11-favorite-count-added.png', false)
  })

  await check('Activity 9: removing a favorite decrements the count and keeps the other cards selected', async () => {
    await click(favoriteSelector('neon-city'))
    await expectCount(evaluate, waitFor, 2)
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
    await waitFor('document.querySelector(".favorite-toast [role=status]")?.textContent === "Película eliminada de favoritos"')
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    await screenshot('24-lab11-favorite-count-removed.png', false)
  })

  await check('Activity 9: a real reload restores both Header count and favorite card states', async () => {
    await reloadPage()
    await expectCount(evaluate, waitFor, 2)
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
    await screenshot('25-lab11-favorite-count-reloaded.png', false)
  })

  await check('Activity 9: removing every favorite persists a zero count after reload', async () => {
    for (const id of await storedFavorites()) await click(favoriteSelector(id))
    await expectCount(evaluate, waitFor, 0)
    assert.deepEqual(await storedFavorites(), [])
    await reloadPage()
    await expectCount(evaluate, waitFor, 0)
    assert.deepEqual(await storedFavorites(), [])
    for (const id of ['lost-orbit', 'last-lighthouse']) await click(favoriteSelector(id))
    await expectCount(evaluate, waitFor, 2)
    await waitFor('document.querySelectorAll(".premiere-card").length === 4')
  })

  await check('Activity 10: keyboard clearing synchronizes banner input and list immediately without reloading', async () => {
    await evaluate('window.__clearDocumentToken = "same-document"; window.__carouselBeforeClear = document.querySelector(".premieres-track"); true')
    const favorites = await storedFavorites()
    await typeSearch(' FARO ')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    assert.equal(await evaluate('document.querySelector(".favorite-count span").textContent'), '2')
    assert.equal(await evaluate('document.querySelectorAll(".favorite-button[aria-pressed=true]").length'), 1)
    await screenshot('26-lab11-filter-applied.png')
    await evaluate('document.querySelector("#movie-search").focus()')
    await pressKey(send, 'Tab', 'Tab', 9)
    assert.equal(await evaluate('document.activeElement === document.querySelector(".clear-filters")'), true)
    assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
    assert.equal(await evaluate('document.querySelector(".clear-filters").textContent'), 'Limpiar filtros')
    assert.equal(await evaluate('document.querySelector(".clear-filters").getAttribute("aria-controls")'), 'movie-results')
    await screenshot('27-lab11-clear-filters-button.png', false, true)
    await pressKey(send, 'Enter', 'Enter', 13)
    await expectRestored(evaluate, waitFor)
    assert.equal(await evaluate('window.__clearDocumentToken'), 'same-document')
    assert.deepEqual(await storedFavorites(), favorites)
    await expectCount(evaluate, waitFor, 2)
    assert.equal(await evaluate('window.__carouselBeforeClear === document.querySelector(".premieres-track")'), true)
    assert.equal(await evaluate('document.querySelectorAll(".premiere-card").length'), 4)
    await screenshot('28-lab11-filter-cleared-billboard.png')
  })

  await check('Activity 10: clearing an unmatched search removes the empty state and restores all results', async () => {
    await typeSearch('zzzz-no-existe')
    await waitFor('Boolean(document.querySelector(".empty-state"))')
    assert.match(await evaluate('document.querySelector(".movie-count").textContent'), /^0 películas/)
    await click('.clear-filters')
    await expectRestored(evaluate, waitFor)
    await click('.clear-filters')
    await expectRestored(evaluate, waitFor)
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
  })

  await check('Activity 10: a pending search is canceled before 400 ms and cannot restore stale results', async () => {
    await typeSearch('faro')
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await screenshot('29-lab11-search-pending.png', false)
    await click('.clear-filters')
    await expectRestored(evaluate, waitFor)
    await delay(550)

    const start = consoleMessages.length
    await evaluate('window.__pendingSearchStartedAt = performance.now()')
    await typeSearch('zzzz-pending-search')
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await click('.clear-filters')
    assert.ok(await evaluate('performance.now() - window.__pendingSearchStartedAt < 400'))
    await expectRestored(evaluate, waitFor)
    await delay(550)
    await expectRestored(evaluate, waitFor)
    assert.equal(consoleMessages.slice(start).some(({ text }) => text === '[MovieSearch] Debounced search: zzzz-pending-search'), false)
    assert.equal(await evaluate('window.__clearDocumentToken'), 'same-document')
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
    await screenshot('30-lab11-pending-search-cleared.png')
  })

  await check('Activity 10: typing immediately after clear never reveals the previously confirmed search', async () => {
    await typeSearch('faro')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'El último faro')
    await click('.clear-filters')
    await expectRestored(evaluate, waitFor)
    await typeSearch('cielo')
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await delay(150)
    assert.equal(await evaluate('document.querySelectorAll(".movie-card").length'), 8)
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelector(".card-heading h3").textContent'), 'Un cielo de papel')
    await click('.clear-filters')
    await typeSearch('faro')
    await click('.clear-filters')
    await typeSearch('neón')
    await click('.clear-filters')
    await delay(550)
    await expectRestored(evaluate, waitFor)
    assert.equal(await evaluate('document.querySelectorAll(".premiere-card").length'), 4)
  })

  await check('Activities 9 and 10: mobile count, keyboard clearing, navigation and carousel remain accessible', async () => {
    for (const width of [600, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 })
      await typeSearch('faro')
      await waitFor('document.querySelectorAll(".movie-card").length === 1')
      assert.equal(await evaluate('document.querySelector(".favorite-count span").textContent'), '2')
      await evaluate('document.querySelector("#movie-search").focus()')
      await pressKey(send, 'Tab', 'Tab', 9)
      assert.equal(await evaluate('document.activeElement === document.querySelector(".clear-filters")'), true)
      await pressKey(send, 'Enter', 'Enter', 13)
      await expectRestored(evaluate, waitFor)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
      assert.equal(await evaluate(`Array.from(document.querySelectorAll('.brand, .main-nav, .favorite-count')).every(element => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.left >= 0 && rect.right <= window.innerWidth
      })`), true)
      await expectCount(evaluate, waitFor, 2)
      assert.equal(await evaluate('document.querySelectorAll(".premiere-card").length'), 4)
      if (width === 390) await screenshot('31-lab11-shared-state-mobile.png', false)
    }
    await click('.main-nav a[href="#cartelera"]')
    await waitFor('location.hash === "#cartelera"')
    assert.equal(await evaluate('window.__clearDocumentToken'), 'same-document')
    assert.deepEqual(await storedFavorites(), ['lost-orbit', 'last-lighthouse'])
    await click('.premieres-next')
    await waitFor('document.querySelector(".premieres-track").scrollLeft > 0')
    await click('.premieres-previous')
    await waitFor('document.querySelector(".premieres-track").scrollLeft === 0')
  })
}
