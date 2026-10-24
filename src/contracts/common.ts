import { z } from 'zod'

/** ETH amounts always travel as decimal strings (never JS numbers). */
export const moneySchema = z.string().regex(/^-?\d+(?:\.\d{1,18})?$/, {
  error: 'Money must be a decimal string with up to 18 fractional digits.',
})

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'QUOTE_STALE',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'WALLET_NOT_CONNECTED',
  'TRANSIENT',
  'INTERNAL',
])

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  /** Field-level messages, keyed by the request field name. */
  fieldErrors: z.record(z.string(), z.string()).optional(),
  details: z.unknown().optional(),
})

export type Money = z.infer<typeof moneySchema>
export type Pagination = z.infer<typeof paginationSchema>
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>
