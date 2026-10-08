export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } }).catch(() => { throw Object.assign(new Error('API_OFFLINE'), { code: 'API_OFFLINE' }) })
  const data = await response.json().catch(() => { throw Object.assign(new Error('API_RESPONSE_INVALID'), { code: 'API_RESPONSE_INVALID', status: response.status, detail: `/api${path} · HTTP ${response.status} · ${response.headers.get('content-type') || '—'}` }) })
  if (!response.ok) throw Object.assign(new Error(data.error || 'REQUEST_FAILED'), { code: data.error || 'REQUEST_FAILED', status: response.status })
  return data
}
export const post = (path, payload) => api(path, { method: 'POST', body: JSON.stringify(payload) })
export const patch = (path, payload) => api(path, { method: 'PATCH', body: JSON.stringify(payload) })
