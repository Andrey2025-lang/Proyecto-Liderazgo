import axios from 'axios'

export const API_URL =
  import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data?.message === 'string') return data.message
    if (Array.isArray(data?.message)) return data.message.join(' ')
    if (typeof data?.error === 'string') return data.error
    return error.message || 'No se pudo completar la operación.'
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}
