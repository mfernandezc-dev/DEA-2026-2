import { useCallback, useEffect, useMemo, useState } from 'react'
import adaptMovie from '../adapters/movieAdapter.js'
import rawMovies from '../data/movies.js'

// Reuse four existing titles as simulated premieres, without changing the catalog.
const premiereMovies = rawMovies.slice(0, 4)
const loadingResult = { status: 'loading', data: [], error: null }

function usePremieres({ delay = 800, failAttempts = 0 } = {}) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const request = useMemo(() => ({ attempt, delay, failAttempts }), [attempt, delay, failAttempts])

  const retry = useCallback(() => {
    setAttempt((currentAttempt) => currentAttempt + 1)
  }, [])

  useEffect(() => {
    let active = true

    const timeoutId = setTimeout(() => {
      if (!active) return

      try {
        if (request.attempt < request.failAttempts) {
          throw new Error('No se pudieron cargar los estrenos. Inténtalo nuevamente.')
        }

        setResult({ request, status: 'success', data: premiereMovies.map(adaptMovie), error: null })
      } catch (error) {
        setResult({ request, status: 'error', data: [], error: error.message })
      }
    }, request.delay)

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [request])

  const currentResult = result?.request === request ? result : loadingResult
  return { status: currentResult.status, data: currentResult.data, error: currentResult.error, retry }
}

export default usePremieres
