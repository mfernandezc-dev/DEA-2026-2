import { useEffect, useState } from 'react'

function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(() => value)

  useEffect(() => {
    if (Object.is(value, debouncedValue)) return

    const timeoutId = setTimeout(() => setDebouncedValue(() => value), delay)

    return () => clearTimeout(timeoutId)
  }, [value, delay, debouncedValue])

  return debouncedValue
}

export default useDebounce
