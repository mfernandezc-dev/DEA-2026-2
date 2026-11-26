import { useEffect, useState } from 'react'

function readWindowSize() {
  return typeof window === 'undefined'
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight }
}

function useWindowSize() {
  const [size, setSize] = useState(readWindowSize)

  useEffect(() => {
    function handleResize() {
      const nextSize = readWindowSize()
      setSize((currentSize) => (
        currentSize.width === nextSize.width && currentSize.height === nextSize.height
          ? currentSize
          : nextSize
      ))
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}

export default useWindowSize
