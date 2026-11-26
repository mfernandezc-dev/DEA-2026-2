import axios from 'axios'

const baseURL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'

const api = axios.create({
  baseURL: `${baseURL.replace(/\/+$/, '')}/`,
  timeout: 10000,
  headers: { Accept: 'application/json' },
})

export const isRequestCanceled = axios.isCancel

// Keep the original AxiosError so existing handlers and cancellation still work.
export function getApiErrorMessage(error, fallback = 'No se pudo completar la solicitud.') {
  if (isRequestCanceled(error)) return 'Solicitud cancelada.'
  if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder.'
  if (error.isAxiosError && !error.response) return 'No se pudo conectar con el servidor.'
  if (typeof error.response?.data?.detail === 'string') return error.response.data.detail
  return fallback
}

export default api
