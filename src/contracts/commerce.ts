import { z } from 'zod'
import { moneySchema } from './common'
import { editionIdSchema, networkIdSchema } from './nft'
import { ensSuffixSchema, walletTypeSchema } from './account'

/* ---------- Favorites ---------- */

export const favoritesSchema = z.object({
  nftIds: z.array(z.string()),
})

/* ---------- Cart ---------- */

export const cartLineSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  unitPriceEth: moneySchema,
  /** Units the edition still has (may be lower than quantity after a change). */
  available: z.number().int().nonnegative(),
  /** Max units this line may hold: min(available, maxPerOrder). */
  maxQuantity: z.number().int().nonnegative(),
  nftVersion: z.number().int().nonnegative(),
})

export const cartSchema = z.object({
  items: z.array(cartLineSchema),
  couponCode: z.string().nullable(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string(),
})

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})

export const updateCartItemInputSchema = z.object({
  quantity: z.number().int().positive(),
})

export const couponInputSchema = z.object({
  code: z.string().trim().min(1, 'Digite um código promocional.').max(32),
})

export const mergeCartInputSchema = z.object({
  guestCartId: z.string(),
})

/* ---------- Quote ---------- */

export const quoteItemInputSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})

export const quoteRequestSchema = z.object({
  items: z.array(quoteItemInputSchema).min(1),
  couponCode: z.string().nullable(),
  network: networkIdSchema.optional(),
})

export const quoteLineSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  quantity: z.number().int().positive(),
  unitPriceEth: moneySchema,
  lineTotalEth: moneySchema,
  available: z.number().int().nonnegative(),
  nftVersion: z.number().int().nonnegative(),
})

export const quoteIssueSchema = z.object({
  type: z.enum(['UNAVAILABLE', 'INSUFFICIENT_QUANTITY', 'COUPON_INVALID', 'COUPON_EXPIRED']),
  nftId: z.string().optional(),
  editionId: editionIdSchema.optional(),
  message: z.string(),
})

export const quoteSchema = z.object({
  id: z.string(),
  /** Hash of lines + coupon + fee. Changes whenever any value changes. */
  hash: z.string(),
  lines: z.array(quoteLineSchema),
  subtotalEth: moneySchema,
  discountEth: moneySchema,
  networkFeeEth: moneySchema,
  totalEth: moneySchema,
  coupon: z
    .object({ code: z.string(), percent: z.number(), label: z.string() })
    .nullable(),
  issues: z.array(quoteIssueSchema),
  network: networkIdSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
})

/** Body of a 409 QUOTE_STALE error. */
export const quoteStaleDetailsSchema = z.object({
  quote: quoteSchema,
  changes: z.array(z.string()),
})

/* ---------- Orders ---------- */

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])

export const collectorInputSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  profileName: z.string(),
  walletAddress: z.string(),
  secondaryAddress: z.string(),
  walletType: walletTypeSchema,
  referralCode: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
})

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  quoteHash: z.string(),
  walletId: z.string(),
  network: networkIdSchema,
  collector: collectorInputSchema,
  note: z.string().max(500),
})

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  lines: z.array(quoteLineSchema),
  subtotalEth: moneySchema,
  discountEth: moneySchema,
  networkFeeEth: moneySchema,
  totalEth: moneySchema,
  couponCode: z.string().nullable(),
  network: networkIdSchema,
  wallet: z.object({
    id: z.string(),
    type: walletTypeSchema,
    address: z.string(),
    label: z.string(),
  }),
})

/* ---------- Newsletter ---------- */

export const newsletterInputSchema = z.object({
  email: z.string().trim().min(1, 'Digite seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
})

/* ---------- Realtime events ---------- */

const eventBase = {
  /** Stable event identity; duplicates share the same id. */
  id: z.string(),
  occurredAt: z.string(),
  /** Monotonic resource version; older versions must be ignored. */
  version: z.number().int().nonnegative(),
}

export const nftUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    priceEth: moneySchema,
    compareAtEth: moneySchema.nullable(),
    soldOut: z.boolean(),
    editions: z.array(z.object({ id: editionIdSchema, available: z.number().int().nonnegative() })),
  }),
})

export const orderUpdatedEventSchema = z.object({
  ...eventBase,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  userId: z.string(),
  data: z.object({
    status: orderStatusSchema,
    txHash: z.string().nullable(),
    explorerUrl: z.string().nullable(),
    rejectionReason: z.string().nullable(),
  }),
})

export type Favorites = z.infer<typeof favoritesSchema>
export type CartLine = z.infer<typeof cartLineSchema>
export type Cart = z.infer<typeof cartSchema>
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>
export type QuoteRequest = z.infer<typeof quoteRequestSchema>
export type QuoteLine = z.infer<typeof quoteLineSchema>
export type QuoteIssue = z.infer<typeof quoteIssueSchema>
export type Quote = z.infer<typeof quoteSchema>
export type QuoteStaleDetails = z.infer<typeof quoteStaleDetailsSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type CollectorInput = z.infer<typeof collectorInputSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>
export type Order = z.infer<typeof orderSchema>
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
