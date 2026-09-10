import { useEffect, useRef, useState } from 'react'

/**
 * Runs one or more API calls and tracks loading / error / data state.
 * `fetcher` receives an AbortSignal-free convenience — kosh's fetch
 * helper handles its own error copy, we just track lifecycle here.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setLoading(true)
    setError(null)
    fetcher()
      .then((res) => {
        if (mounted.current) setData(res)
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || 'Something went wrong')
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
