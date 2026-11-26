import { useEffect, useState } from 'react'
import { isRequestCanceled } from '../services/api.js'

export default function useStoreResource(load) {
  const [attempt, setAttempt] = useState(0)
  const [resource, setResource] = useState({ status: 'loading', data: null, error: null })
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setResource({ load, attempt, status: 'success', data, error: null })
    }).catch(error => {
      if (!controller.signal.aborted && !isRequestCanceled(error)) setResource({ load, attempt, status: 'error', data: null, error })
    })
    return () => controller.abort()
  }, [load, attempt])
  const current = resource.load === load && resource.attempt === attempt ? resource : { status: 'loading', data: null, error: null }
  return { ...current, retry: () => setAttempt(value => value + 1) }
}
