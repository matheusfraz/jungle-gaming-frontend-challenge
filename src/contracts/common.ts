import { z } from 'zod'

export const moneySchema = z.string().regex(/^-?\d+(?:\.\d{1,18})?$/, {
  error: 'Money must be a decimal string with up to 18 fractional digits.',
})

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export type Money = z.infer<typeof moneySchema>
export type Pagination = z.infer<typeof paginationSchema>
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>
