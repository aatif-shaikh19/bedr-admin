import axios from 'axios'

// ─── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY,
  },
  timeout: 15000, // 15 second timeout
})

// ─── Response Interceptor ──────────────────────────────────────────────────────
// Unwraps the { success, data } envelope so components get data directly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract the clean error message from our API error shape
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Something went wrong'
    error.displayMessage = message
    return Promise.reject(error)
  }
)

// ─── Flats ─────────────────────────────────────────────────────────────────────
export const flatsApi = {
  getAll: () => api.get('/flats').then(r => r.data.data),
  getById: (id) => api.get(`/flats/${id}`).then(r => r.data.data),
  create: (data) => api.post('/flats', data).then(r => r.data.data),
  delete: (id) => api.delete(`/flats/${id}`).then(r => r.data.data),
}

// ─── Rooms ─────────────────────────────────────────────────────────────────────
export const roomsApi = {
  getByFlat: (flatId) => api.get(`/flats/${flatId}/rooms`).then(r => r.data.data),
  getById: (id) => api.get(`/rooms/${id}`).then(r => r.data.data),
  create: (flatId, data) => api.post(`/flats/${flatId}/rooms`, data).then(r => r.data.data),
  delete: (id) => api.delete(`/rooms/${id}`).then(r => r.data.data),
}

// ─── Beds ──────────────────────────────────────────────────────────────────────
export const bedsApi = {
  getByRoom: (roomId) => api.get(`/rooms/${roomId}/beds`).then(r => r.data.data),
  getById: (id) => api.get(`/beds/${id}`).then(r => r.data.data),
  create: (roomId, data) => api.post(`/rooms/${roomId}/beds`, data).then(r => r.data.data),
  updateStatus: (id, status) => api.patch(`/beds/${id}/status`, { status }).then(r => r.data.data),
  delete: (id) => api.delete(`/beds/${id}`).then(r => r.data.data),
}

// ─── Tenants ───────────────────────────────────────────────────────────────────
export const tenantsApi = {
  getAll: () => api.get('/tenants').then(r => r.data.data),
  getById: (id) => api.get(`/tenants/${id}`).then(r => r.data.data),
  create: (data) => api.post('/tenants', data).then(r => r.data.data),
  delete: (id) => api.delete(`/tenants/${id}`).then(r => r.data.data),
}

// ─── Assignments ───────────────────────────────────────────────────────────────
export const assignmentsApi = {
  create: (data) => api.post('/assignments', data).then(r => r.data.data),
  move: (id, newBedId) => api.patch(`/assignments/${id}/move`, { new_bed_id: newBedId }).then(r => r.data.data),
  delete: (id) => api.delete(`/assignments/${id}`).then(r => r.data.data),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data.data),
}

export default api