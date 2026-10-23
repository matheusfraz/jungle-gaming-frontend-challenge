import axios, { AxiosError } from 'axios'
import { env } from '../env'

export class ApiRequestError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

function normalizeError(error: AxiosError<{ code?: string; message?: string }>) {
  const message = error.response?.data?.message ?? error.message

  return new ApiRequestError(
    message,
    error.response?.status,
    error.response?.data?.code,
  )
}

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  headers: { Accept: 'application/json' },
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(normalizeError(error))
    }

    return Promise.reject(error)
  },
)
