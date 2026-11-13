import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', headers: { Accept: 'application/json' } })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export function setToken(token: string | null) {
  if (token) localStorage.setItem('tf_token', token)
  else localStorage.removeItem('tf_token')
}
