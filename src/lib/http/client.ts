import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { apiErrorSchema, type ApiErrorCode } from '@/contracts/common'
import { env } from '@/lib/env'
import { emitSessionInvalid, getGuestCartId, getToken } from '@/lib/session/token'

type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'INVALID_RESPONSE'

export class ApiRequestError extends Error {
  readonly status: number | undefined
  readonly code: ClientErrorCode
  readonly fieldErrors: Record<string, string>
  readonly details: unknown

  constructor(options: {
    message: string
    status?: number
    code: ClientErrorCode
    fieldErrors?: Record<string, string>
    details?: unknown
  }) {
    super(options.message)
    this.name = 'ApiRequestError'
    this.status = options.status
    this.code = options.code
    this.fieldErrors = options.fieldErrors ?? {}
    this.details = options.details
  }

  /** Network failures, timeouts and 5xx can be retried safely (idempotent calls only). */
  get isTransient(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.code === 'TIMEOUT' ||
      this.code === 'TRANSIENT' ||
      (this.status !== undefined && this.status >= 500)
    )
  }
}

export function isApiError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}

function normalizeError(error: AxiosError): ApiRequestError {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
    return new ApiRequestError({ message: 'Requisição cancelada.', code: 'CANCELED' })
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiRequestError({
      message: 'O servidor demorou demais para responder.',
      code: 'TIMEOUT',
    })
  }
  if (!error.response) {
    return new ApiRequestError({
      message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      code: 'NETWORK_ERROR',
    })
  }

  const parsed = apiErrorSchema.safeParse(error.response.data)
  if (parsed.success) {
    return new ApiRequestError({
      message: parsed.data.message,
      status: error.response.status,
      code: parsed.data.code,
      fieldErrors: parsed.data.fieldErrors,
      details: parsed.data.details,
    })
  }

  return new ApiRequestError({
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    status: error.response.status,
    code: error.response.status >= 500 ? 'TRANSIENT' : 'INTERNAL',
  })
}

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Cart', getGuestCartId())
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const normalized = normalizeError(error)

    const sentToken = Boolean(error.config?.headers?.Authorization)
    if (sentToken && normalized.status === 401) {
      emitSessionInvalid(normalized.code === 'SESSION_EXPIRED' ? 'expired' : 'unauthorized')
    }
    return Promise.reject(normalized)
  },
)

/**
 * Typed request helper: every response is validated against its contract so
 * the UI never receives data that does not match the declared types.
 */
export async function request<TSchema extends z.ZodType>(
  schema: TSchema,
  config: AxiosRequestConfig,
): Promise<z.infer<TSchema>> {
  const response = await httpClient.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error('Invalid API response', config.url, parsed.error)
    throw new ApiRequestError({
      message: 'A resposta do servidor não corresponde ao contrato esperado.',
      status: response.status,
      code: 'INVALID_RESPONSE',
    })
  }
  return parsed.data
}

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}
