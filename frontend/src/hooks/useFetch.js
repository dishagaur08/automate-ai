import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * Fetches `path` on mount and whenever it changes. Returns
 * { data, loading, error, refetch } so each section of the UI can
 * show its own loading/error state instead of one failure breaking
 * the whole page.
 *
 * Pass `null`/`undefined`/`false` as `path` to skip fetching entirely
 * (e.g. data behind a modal that isn't open yet) — `loading` stays
 * false and `data` stays null until a real path is passed.
 */
export function useFetch(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!path) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(path)
      setData(result)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
