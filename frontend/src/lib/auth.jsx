import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setAuthToken } from './api'

const TOKEN_STORAGE_KEY = 'automateai_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Keep the api client's Authorization header in sync with the token,
  // and persist/clear it in localStorage so a refresh stays logged in.
  useEffect(() => {
    setAuthToken(token)
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [token])

  // On mount (or whenever the token changes), resolve who's logged in.
  // If the token is missing/expired/invalid, api.js's 401 handler will
  // clear it — see the `authLogout` listener below.
  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const me = await api.get('/api/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) {
          setUser(null)
          setToken(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [token])

  // api.js dispatches this event when a request comes back 401, so a
  // stale/expired token anywhere in the app forces a clean logout.
  useEffect(() => {
    function handleForcedLogout() {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('automateai:unauthorized', handleForcedLogout)
    return () => window.removeEventListener('automateai:unauthorized', handleForcedLogout)
  }, [])

  const login = useCallback(async (email, password) => {
    const result = await api.post('/api/auth/login', { email, password })
    setUser(result.user)
    setToken(result.access_token)
    return result.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const result = await api.post('/api/auth/register', { name, email, password })
    setUser(result.user)
    setToken(result.access_token)
    return result.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
