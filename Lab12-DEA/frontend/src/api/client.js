import axios from 'axios'

const baseURL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'

const api = axios.create({
  baseURL: `${baseURL.replace(/\/+$/, '')}/`,
  timeout: 10000,
  headers: { Accept: 'application/json' },
})

export const isRequestCanceled = axios.isCancel

export default api
