const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  if (res.headers.get('content-type')?.includes('application/pdf')) {
    return res.blob()
  }

  return res.json()
}

export const api = {
  // Patient endpoints
  getSlots: (date, visitType) =>
    request(`/slots?date=${date}&visit_type=${visitType}`),

  bookAppointment: (data) =>
    request('/appointments', { method: 'POST', body: JSON.stringify(data) }),

  // Admin auth
  adminLogin: (password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  // Admin endpoints
  getAppointments: (date) =>
    request(`/admin/appointments${date ? `?date=${date}` : ''}`),

  deleteAppointment: (id) =>
    request(`/admin/appointments/${id}`, { method: 'DELETE' }),

  exportPdf: async (date) => {
    const result = await request('/admin/schedule-print?date=' + date, { method: 'POST' })
    const byteChars = atob(result.data)
    const byteArray = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i)
    }
    return {
      blob: new Blob([byteArray], { type: 'application/pdf' }),
      filename: result.filename,
    }
  },

  // Settings
  getSettings: () =>
    request('/admin/settings'),

  updateSettings: (data) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getSetupStatus: () =>
    request('/admin/settings/status'),

  setup: (data) =>
    request('/admin/settings/setup', { method: 'POST', body: JSON.stringify(data) }),
}
