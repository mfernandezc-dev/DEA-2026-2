import assert from 'node:assert/strict'
import rawMovies from '../src/data/movies.js'
import adaptMovie from '../src/adapters/movieAdapter.js'

async function pressKey(send, key, code, windowsVirtualKeyCode) {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key, code, windowsVirtualKeyCode,
    ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
  })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode })
}

async function assertPremiereData(evaluate, waitFor) {
  await waitFor('document.querySelectorAll(".premiere-card").length === 4')
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".premiere-card h3"), title => title.textContent)'), rawMovies.slice(0, 4).map((movie) => movie.title))
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".premiere-card img"), image => image.getAttribute("src"))'), rawMovies.slice(0, 4).map((movie) => movie.image))
  await waitFor('Array.from(document.querySelectorAll(".premiere-card img")).every(image => image.complete && image.naturalWidth > 0)')
  assert.equal(await evaluate('document.querySelectorAll(".skeleton-card").length'), 0)
  assert.equal(await evaluate('document.querySelector(".premieres-section").getAttribute("aria-busy")'), 'false')
}

export async function runPremieresAppChecks({ check, evaluate, send, waitFor, captureSection, click, typeSearch, storedFavorites, favoriteSelector }) {
  await check('Activity 8 app: initial Skeleton transitions to four premieres after the real request delay', async () => {
    await waitFor('document.querySelector(".premieres-section")?.dataset.status === "success"')
    const states = await evaluate('window.__premiereStates')
    assert.equal(states[0].status, 'loading')
    assert.equal(states[0].skeletonCount, 3)
    assert.match(states[0].message, /Cargando estrenos/)
    const success = states.find((state) => state.status === 'success')
    assert.ok(success.time - states[0].time >= 750)
    await assertPremiereData(evaluate, waitFor)
    assert.equal(await evaluate('document.querySelectorAll("#cartelera .movie-card").length'), 8)
    assert.equal(await evaluate('document.querySelectorAll("#cartelera .showtime").length'), 24)
    assert.equal(await evaluate('document.querySelectorAll(".hero img, #cartelera img").length'), 9)
    assert.equal(await evaluate('document.images.length'), 13)
    assert.equal(await evaluate(`Boolean(
      document.querySelector('#cartelera').compareDocumentPosition(document.querySelector('#estrenos')) & Node.DOCUMENT_POSITION_FOLLOWING
    )`), true)
    assert.equal(await evaluate(`Boolean(
      document.querySelector('#estrenos').compareDocumentPosition(document.querySelector('footer')) & Node.DOCUMENT_POSITION_FOLLOWING
    )`), true)
    assert.equal(await evaluate('new Set(Array.from(document.querySelectorAll("[id]"), element => element.id)).size === document.querySelectorAll("[id]").length'), true)
  })

  await check('Activity 8 carousel: desktop buttons, Tab and Enter navigate accessibly', async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await waitFor('document.querySelector(".premieres-track").style.getPropertyValue("--premiere-columns") === "3"')
    await evaluate('document.querySelector(".premieres-track").focus()')
    await pressKey(send, 'Home', 'Home', 36)
    await waitFor('document.querySelector(".premieres-track").scrollLeft === 0')
    assert.equal(await evaluate('document.querySelector(".premieres-previous").disabled'), true)
    assert.equal(await evaluate('document.querySelector(".premieres-next").disabled'), false)
    const trackId = await evaluate('document.querySelector(".premieres-track").id')
    assert.equal(await evaluate('document.querySelector(".premieres-next").getAttribute("aria-controls")'), trackId)
    await evaluate('document.querySelector(".premieres-next").focus()')
    await pressKey(send, 'Enter', 'Enter', 13)
    await waitFor('document.querySelector(".premieres-track").scrollLeft > 0 && document.querySelector(".premieres-next").disabled')
    assert.match(await evaluate('document.querySelector(".premieres-progress").textContent'), /2–4 de 4/)
    await click('.premieres-previous')
    await waitFor('document.querySelector(".premieres-track").scrollLeft === 0')
    await evaluate('document.querySelector(".premieres-next").focus()')
    await pressKey(send, 'Tab', 'Tab', 9)
    assert.equal(await evaluate('document.activeElement === document.querySelector(".premieres-track")'), true)
    await pressKey(send, 'ArrowRight', 'ArrowRight', 39)
    await waitFor('document.querySelector(".premieres-next").disabled')
    await pressKey(send, 'ArrowLeft', 'ArrowLeft', 37)
    await waitFor('document.querySelector(".premieres-previous").disabled')
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    await captureSection('17-lab11-premieres-desktop.png')
  })

  await check('Activity 8 carousel: mobile buttons, Home, End and native scrolling remain contained', async () => {
    for (const width of [390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: true })
      await waitFor('document.querySelector(".premieres-track").style.getPropertyValue("--premiere-columns") === "1"')
      await evaluate('document.querySelector(".premieres-track").focus()')
      await pressKey(send, 'Home', 'Home', 36)
      await waitFor('document.querySelector(".premieres-previous").disabled')
      for (const index of [1, 2, 3]) {
        await click('.premieres-next')
        await waitFor(`document.querySelector('.premieres-progress').textContent.includes('Estrenos ${index + 1}–${index + 1} de 4')`)
      }
      assert.equal(await evaluate('document.querySelector(".premieres-next").disabled'), true)
      await evaluate('document.querySelector(".premieres-track").focus()')
      await pressKey(send, 'Home', 'Home', 36)
      await waitFor('document.querySelector(".premieres-track").scrollLeft === 0')
      await pressKey(send, 'End', 'End', 35)
      await waitFor('document.querySelector(".premieres-next").disabled')
      await evaluate('document.querySelector(".premieres-track").scrollTo({ left: 0, behavior: "instant" })')
      await waitFor('document.querySelector(".premieres-previous").disabled')
      assert.equal(await evaluate('document.querySelector(".premieres-track").scrollWidth > document.querySelector(".premieres-track").clientWidth'), true)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
      if (width === 390) await captureSection('18-lab11-premieres-mobile.png')
    }
  })

  await check('Activity 8 app: premieres remain independent of search, favorites, notifications and persistence', async () => {
    const before = await storedFavorites()
    await typeSearch('cielo')
    await waitFor('document.querySelectorAll(".movie-card").length === 1')
    assert.equal(await evaluate('document.querySelectorAll(".premiere-card").length'), 4)
    await typeSearch('')
    await waitFor('document.querySelectorAll(".movie-card").length === 8')
    await click(favoriteSelector('last-lighthouse'))
    const expected = before.includes('last-lighthouse') ? before.filter((id) => id !== 'last-lighthouse') : [...before, 'last-lighthouse']
    const message = before.includes('last-lighthouse') ? 'Película eliminada de favoritos' : 'Película agregada a favoritos'
    await waitFor(`document.querySelector('.favorite-toast [role=status]')?.textContent === ${JSON.stringify(message)}`)
    assert.equal(await evaluate('document.querySelectorAll(".favorite-toast").length'), 1)
    assert.deepEqual(await storedFavorites(), expected)
    await evaluate('window.__premieresReloadToken = true')
    await send('Page.reload', { ignoreCache: true })
    await waitFor(`typeof window.__premieresReloadToken === 'undefined' && document.querySelectorAll('.movie-card').length === 8 && document.querySelectorAll('.favorite-button[aria-pressed=true]').length === ${expected.length}`)
    await assertPremiereData(evaluate, waitFor)
    assert.deepEqual(await storedFavorites(), expected)
    assert.equal(await evaluate('document.querySelectorAll(".showtime").length'), 24)
  })
}

export async function runPremieresSectionChecks({ check, evaluate, send, waitFor, captureSection, url }) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${url}tests/fixtures/premieresSection.html` })
  await waitFor('Boolean(window.premieresSectionHarness)')

  await check('Activity 8 section: accessible Skeleton has poster, title and metadata placeholders at every width', async () => {
    await evaluate('window.premieresSectionHarness.mount()')
    assert.equal(await evaluate('document.querySelector(".premieres-section").dataset.status'), 'loading')
    assert.equal(await evaluate('document.querySelector(".premieres-section").getAttribute("aria-busy")'), 'true')
    assert.match(await evaluate('document.querySelector(".premieres-status[role=status]").textContent'), /Cargando estrenos/)
    assert.equal(await evaluate('document.querySelector(".premieres-status").getAttribute("aria-live")'), 'polite')
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-card[aria-hidden=true]").length'), 3)
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-poster, .skeleton-title").length'), 6)
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-line").length'), 9)
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-card img, .premiere-card").length'), 0)
    for (const [width, count] of [[1440, 3], [600, 2], [390, 1], [320, 1]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 })
      assert.equal(await evaluate('Array.from(document.querySelectorAll(".skeleton-card")).filter(card => card.getBoundingClientRect().width > 0).length'), count)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    await captureSection('16-lab11-skeleton-loading.png')
  })

  await check('Activity 8 Skeleton: reduced-motion preference disables its subtle animation', async () => {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".skeleton-block")).every(block => getComputedStyle(block).animationName === "none")'), true)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".skeleton-block")).animationName'), 'skeleton-pulse')
  })

  await check('Activity 8 section: Skeleton remains at 799 ms and disappears for the four movies at 800 ms', async () => {
    await evaluate('window.premieresSectionHarness.advance(799)')
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-card").length'), 3)
    assert.equal(await evaluate('document.querySelectorAll(".premiere-card").length'), 0)
    await evaluate('window.premieresSectionHarness.advance(1)')
    await assertPremiereData(evaluate, waitFor)
    assert.equal(await evaluate('document.querySelector(".premieres-carousel").getAttribute("aria-roledescription")'), 'carrusel')
    assert.equal(await evaluate('document.querySelectorAll(".premiere-card[aria-roledescription=diapositiva]").length'), 4)
    for (const [index, movie] of rawMovies.slice(0, 4).entries()) {
      const text = await evaluate(`document.querySelectorAll('.premiere-card')[${index}].textContent`)
      assert.ok(text.includes(movie.genre))
      assert.ok(text.includes(movie.synopsis))
      assert.ok(text.includes(movie.rating.toFixed(1)))
    }
  })

  await check('Activity 8 section: controlled error exposes a clear alert and an accessible retry button', async () => {
    await evaluate('window.premieresSectionHarness.mount({ failAttempts: 1 }); window.premieresSectionHarness.advance(800)')
    assert.equal(await evaluate('document.querySelector(".premieres-section").dataset.status'), 'error')
    assert.match(await evaluate('document.querySelector(".premieres-error [role=alert]").textContent'), /No se pudieron cargar los estrenos/)
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-card, .premiere-card").length'), 0)
    assert.equal(await evaluate('document.querySelector(".premieres-retry").getAttribute("aria-label")'), 'Reintentar carga de estrenos')
    assert.equal(await evaluate('document.querySelector(".premieres-retry").textContent'), 'Reintentar')
    await captureSection('19-lab11-premieres-error.png')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    assert.equal(await evaluate('document.activeElement === document.querySelector(".premieres-retry")'), true)
    await captureSection('20-lab11-premieres-retry-button.png')
  })

  await check('Activity 8 section: keyboard retry invokes the hook and recovers through loading to success', async () => {
    await pressKey(send, 'Enter', 'Enter', 13)
    await waitFor('document.querySelector(".premieres-section").dataset.status === "loading"')
    await waitFor('window.premieresSectionHarness.pendingTimers() === 1')
    assert.equal(await evaluate('document.querySelectorAll(".skeleton-card").length'), 3)
    assert.equal(await evaluate('document.querySelectorAll(".premieres-error").length'), 0)
    await evaluate('window.premieresSectionHarness.advance(800)')
    await assertPremiereData(evaluate, waitFor)
    assert.equal(await evaluate('document.querySelectorAll(".premieres-retry").length'), 0)
    await captureSection('21-lab11-premieres-after-retry.png')
  })

  await check('Activity 8 carousel: movies are reusable props without another request or artificial records', async () => {
    await evaluate(`window.premieresSectionHarness.mountCarousel(${JSON.stringify(rawMovies.slice(0, 2).map(adaptMovie))})`)
    await waitFor('document.querySelectorAll(".premiere-card").length === 2')
    assert.equal(await evaluate('window.premieresSectionHarness.pendingTimers()'), 0)
    assert.equal(await evaluate('document.querySelector(".premieres-next").disabled'), true)
    assert.equal(await evaluate('document.querySelector(".premieres-previous").disabled'), true)
    assert.match(await evaluate('document.querySelector(".premieres-progress").textContent'), /1–2 de 2/)
    await evaluate('window.premieresSectionHarness.mountCarousel([])')
    assert.match(await evaluate('document.querySelector("[role=status]").textContent'), /No hay estrenos disponibles/)
    assert.equal(await evaluate('window.premieresSectionHarness.pendingTimers()'), 0)
  })

  await evaluate('window.premieresSectionHarness.dispose()')
}
