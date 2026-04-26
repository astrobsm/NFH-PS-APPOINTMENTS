import { addToQueue, requestBackgroundSync } from './offlineQueue'

const API_BASE = '/api'

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

// Wrapper that queues POST requests when offline
async function requestWithOfflineQueue(url, options = {}, offlineMeta = {}) {
  if (navigator.onLine) {
    return request(url, options)
  }

  // Queue for later sync
  const token = localStorage.getItem('admin_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  await addToQueue({
    url: `${API_BASE}${url}`,
    headers,
    body: options.body,
    type: offlineMeta.type || 'unknown',
    timestamp: Date.now(),
  })

  requestBackgroundSync()

  // Return a synthetic response so the UI can show confirmation
  const parsed = JSON.parse(options.body)
  return {
    ...parsed,
    id: `OFFLINE-${Date.now()}`,
    _offline: true,
    status: offlineMeta.type === 'surgery' ? 'pending' : undefined,
  }
}

export const api = {
  // Patient search (returning patients)
  searchPatients: (q) =>
    request(`/patients?q=${encodeURIComponent(q)}`),

  // Patient endpoints
  getSlots: (date, visitType) =>
    request(`/slots?date=${date}&visit_type=${visitType}`),

  bookAppointment: (data) =>
    requestWithOfflineQueue(
      '/appointments',
      { method: 'POST', body: JSON.stringify(data) },
      { type: 'appointment' }
    ),

  // Surgery endpoints
  bookSurgery: (data) =>
    requestWithOfflineQueue(
      '/surgeries',
      { method: 'POST', body: JSON.stringify(data) },
      { type: 'surgery' }
    ),

  // Admin auth
  adminLogin: (password) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),

  // Admin endpoints
  getAppointments: (date) =>
    request(`/admin/appointments${date ? `?date=${date}` : ''}`),

  deleteAppointment: (id) =>
    request(`/admin/appointments/${id}`, { method: 'DELETE' }),

  // Admin surgery endpoints
  getSurgeries: (status) =>
    request(`/admin/surgeries${status ? `?status=${status}` : ''}`),

  updateSurgery: (id, data) =>
    request(`/admin/surgeries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSurgery: (id) =>
    request(`/admin/surgeries/${id}`, { method: 'DELETE' }),

  // Surgery education (AI-aided)
  generateSurgeryEducation: (procedureName, diagnosis) =>
    request('/surgery-education', {
      method: 'POST',
      body: JSON.stringify({ procedure_name: procedureName, diagnosis }),
    }),

  // Meal plan generation (MUST-based, SE Nigeria)
  generateMealPlan: (data) =>
    request('/generate-meal-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Education PDF (standalone A4 for sharing/printing)
  getEducationPdf: async (data) => {
    const result = await request('/education-pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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

  // Surgery PDF
  getSurgeryPdf: async (id) => {
    const result = await request(`/admin/surgery-pdf/${id}`)
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

  // Ward Round endpoints
  bookWardRound: (data) =>
    request('/ward-rounds', { method: 'POST', body: JSON.stringify(data) }),

  getWardRounds: (date, status) => {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (status) params.set('status', status)
    const qs = params.toString()
    return request(`/admin/ward-rounds${qs ? `?${qs}` : ''}`)
  },

  updateWardRound: (id, data) =>
    request(`/admin/ward-rounds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteWardRound: (id) =>
    request(`/admin/ward-rounds/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () =>
    request('/admin/settings'),

  updateSettings: (data) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getSetupStatus: () =>
    request('/admin/settings/status'),

  setup: (data) =>
    request('/admin/settings/setup', { method: 'POST', body: JSON.stringify(data) }),

  // ── Specialties & Surgeons (master data) ──
  getSpecialties: () => request('/specialties'),
  createSpecialty: (name) =>
    request('/admin/specialties', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteSpecialty: (id) =>
    request(`/admin/specialties/${id}`, { method: 'DELETE' }),

  getSurgeons: (specialtyId) =>
    request(`/surgeons${specialtyId ? `?specialty_id=${specialtyId}` : ''}`),
  createSurgeon: (full_name, specialty_id) =>
    request('/admin/surgeons', { method: 'POST', body: JSON.stringify({ full_name, specialty_id }) }),
  // Public upsert (no auth) — used by the public booking form when a surgeon name is typed
  upsertSurgeonPublic: (full_name, specialty_id) =>
    request('/surgeons', { method: 'POST', body: JSON.stringify({ full_name, specialty_id }) }),
  deleteSurgeon: (id) =>
    request(`/admin/surgeons/${id}`, { method: 'DELETE' }),

  // ── Public theatre registry (no login) ──
  getPublicSurgeries: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/public/surgeries${qs ? `?${qs}` : ''}`)
  },
  bookPublicSurgery: (data) =>
    request('/public/surgeries', { method: 'POST', body: JSON.stringify(data) }),
}
