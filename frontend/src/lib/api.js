// Base URL for the AutomateAI backend. Configurable via a .env file
// (copy frontend/.env.example to frontend/.env and adjust if needed).
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// The current session's JWT, set by lib/auth.jsx (AuthProvider) after
// login/register/refresh. Kept as a module-level variable (not React
// state) so apiFetch — a plain function, not a hook — can read it
// synchronously on every request without prop-drilling the token
// through every component that calls the API.
let authToken = null

export function setAuthToken(token) {
  authToken = token || null
}

/**
 * Fetch JSON from the backend and throw a readable error on failure,
 * so callers (useFetch, or a form's try/catch) can surface a graceful
 * message instead of a raw network exception.
 *
 * Automatically attaches `Authorization: Bearer <token>` when a
 * session token is set. On a 401 (expired/invalid/missing token), it
 * dispatches a window event so AuthProvider can clear the stale
 * session and redirect to /login — a single place handles this for
 * every request in the app.
 */
export async function apiFetch(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...options,
    })
  } catch (err) {
    throw new Error(
      'Could not reach the AutomateAI backend. Is it running on ' + API_URL + '?'
    )
  }

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('automateai:unauthorized'))
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.detail) {
        // FastAPI/Pydantic validation errors come back as an array of
        // {loc, msg, ...} objects rather than a plain string.
        detail = Array.isArray(body.detail)
          ? body.detail.map((d) => d.msg).join(', ')
          : body.detail
      }
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

/** Builds a query string from a params object, skipping empty values. */
function toQuery(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  )
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),

  leads: {
    list: (params) => apiFetch(`/api/leads${toQuery(params)}`),
    get: (id) => apiFetch(`/api/leads/${id}`),
    create: (data) => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => apiFetch(`/api/leads/${id}`, { method: 'DELETE' }),
  },

  customers: {
    list: (params) => apiFetch(`/api/customers${toQuery(params)}`),
    get: (id) => apiFetch(`/api/customers/${id}`),
    create: (data) => apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => apiFetch(`/api/customers/${id}`, { method: 'DELETE' }),
  },

  tasks: {
    list: (params) => apiFetch(`/api/tasks${toQuery(params)}`),
    get: (id) => apiFetch(`/api/tasks/${id}`),
    create: (data) => apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) =>
      apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
  },

  approvals: {
    list: (params) => apiFetch(`/api/approvals${toQuery(params)}`),
    act: (id, status) =>
      apiFetch(`/api/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },

  ai: {
    command: (command) => apiFetch('/api/ai/command', { method: 'POST', body: JSON.stringify({ command }) }),
    activity: (params) => apiFetch(`/api/ai/activity${toQuery(params)}`),
    approve: (id) => apiFetch(`/api/ai/approvals/${id}/approve`, { method: 'POST' }),
    reject: (id) => apiFetch(`/api/ai/approvals/${id}/reject`, { method: 'POST' }),
  },

  documents: {
    list: () => apiFetch('/api/documents'),
    upload: async (file) => {
      const form = new FormData()
      form.append('file', file)
      let response
      try {
        response = await fetch(`${API_URL}/api/documents`, {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: form,
        })
      } catch {
        throw new Error('Could not reach the AutomateAI backend. Is it running on ' + API_URL + '?')
      }
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('automateai:unauthorized'))
      }
      if (!response.ok) {
        let detail = `Upload failed (${response.status})`
        try {
          const body = await response.json()
          if (body?.detail) {
            detail = Array.isArray(body.detail) ? body.detail.map((d) => d.msg).join(', ') : body.detail
          }
        } catch {
          // not JSON — keep generic message
        }
        throw new Error(detail)
      }
      return response.json()
    },
    remove: (id) => apiFetch(`/api/documents/${id}`, { method: 'DELETE' }),
  },

  knowledgeBase: {
    query: (question) =>
      apiFetch('/api/knowledge-base/query', { method: 'POST', body: JSON.stringify({ question }) }),
  },
  workflows: {
    list: () => apiFetch('/api/workflows'),
    create: (data) => apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiFetch(`/api/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id) => apiFetch(`/api/workflows/${id}`, { method: 'DELETE' }),
    history: () => apiFetch('/api/workflows/executions/history'),
    suggest: (prompt) => apiFetch('/api/workflows/ai-suggest', { method: 'POST', body: JSON.stringify({ prompt }) }),
  },
  analytics: {
    get: (params) => apiFetch(`/api/analytics${toQuery(params)}`),
  },
  emails: {
    list: () => apiFetch('/api/emails'),
    send: (data) => apiFetch('/api/emails/send', { method: 'POST', body: JSON.stringify(data) }),
    draft: (data) => apiFetch('/api/emails/draft', { method: 'POST', body: JSON.stringify(data) }),
    sendExisting: (id) => apiFetch(`/api/emails/${id}/send`, { method: 'POST' }),
  },
}
