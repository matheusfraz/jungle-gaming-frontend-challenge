import type { Wallet } from '@/contracts/account'
import type { Cart, CartLine, Order, Quote, QuoteIssue, QuoteItemInput, QuoteLine } from '@/contracts/commerce'
import type { EditionId, NetworkId, NftDetail, NftSummary } from '@/contracts/nft'
import { addMoney, multiplyMoney, percentOf, subtractMoney, sumMoney } from '@/lib/money'
import {
  artworkAltText,
  artworkAttributeList,
  artworkGallery,
  artworkImage,
  buildNftFixtures,
  type NftRecord,
} from './fixtures/nfts'
import { buildFavoriteFixtures, buildUserFixtures, buildWalletFixtures, type UserRecord } from './fixtures/users'
import { isScenarioId, type ScenarioId } from './scenarios'

/**
 * In-memory "backend" shared by every MSW handler and by the Socket.IO mock.
 * It is persisted to localStorage so refreshes keep a consistent state, and
 * `resetDb()` restores the fixtures exactly.
 */

interface CartRecord {
  items: { id: string; nftId: string; editionId: EditionId; quantity: number }[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  requestHash: string
  settleAt: number
  outcome: 'confirmed' | 'rejected'
  cartOwner: string
}

interface WalletBook {
  primary: Wallet | null
  secondary: Wallet | null
  secondarySameAsPrimary: boolean
}

export interface PendingSignupRecord {
  id: string
  username: string
  email: string
  salt: string
  passwordHash: string
  codeHash: string
  attempts: number
  expiresAt: number
  resendAvailableAt: number
}

/** E-mails the mock "server" sends; shown in the simulated inbox (Mocks panel). */
export interface OutboxMessage {
  id: string
  to: string
  subject: string
  code: string
  sentAt: string
}

export interface MockDb {
  schema: 4
  nfts: Record<string, NftRecord>
  nftOrder: string[]
  users: Record<string, UserRecord>
  sessions: Record<string, { userId: string; expiresAt: number }>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  wallets: Record<string, WalletBook>
  walletConnections: Record<string, 'connected' | 'disconnected'>
  quotes: Record<string, Quote & { owner: string }>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, string>
  eventSeq: number
  /** Scenario side effects already consumed (e.g. "price changed once"). */
  consumed: string[]
  newsletter: string[]
  pendingSignups: Record<string, PendingSignupRecord>
  outbox: OutboxMessage[]
}

const DB_KEY = 'kurio:mock-db'
const SCENARIO_KEY = 'kurio:mock-scenario'

function seed(): MockDb {
  const nfts = buildNftFixtures()
  return {
    schema: 4,
    nfts: Object.fromEntries(nfts.map((nft) => [nft.id, nft])),
    nftOrder: nfts.map((nft) => nft.id),
    users: Object.fromEntries(buildUserFixtures().map((user) => [user.id, user])),
    sessions: {},
    favorites: buildFavoriteFixtures(),
    carts: {},
    wallets: buildWalletFixtures(),
    walletConnections: {},
    quotes: {},
    orders: {},
    idempotency: {},
    eventSeq: 0,
    consumed: [],
    newsletter: [],
    pendingSignups: {},
    outbox: [],
  }
}

function load(): MockDb {
  try {
    const raw = window.localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (parsed.schema === 4) return parsed
    }
  } catch {
    /* corrupted or unavailable storage: fall back to fixtures */
  }
  return seed()
}

export let db: MockDb = load()

export function saveDb(): void {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* persistence is best effort */
  }
}

export function resetDb(): void {
  db = seed()
  saveDb()
}

/* ---------- Scenario state ---------- */

function readScenario(): ScenarioId {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('mock-scenario')
    if (isScenarioId(fromUrl)) {
      window.sessionStorage.setItem(SCENARIO_KEY, fromUrl)
      return fromUrl
    }
    const stored = window.sessionStorage.getItem(SCENARIO_KEY)
    if (isScenarioId(stored)) return stored
  } catch {
    /* ignore */
  }
  return 'default'
}

let scenario: ScenarioId = readScenario()

export function getScenario(): ScenarioId {
  return scenario
}

export function setScenario(next: ScenarioId): void {
  scenario = next
  db.consumed = []
  saveDb()
  try {
    window.sessionStorage.setItem(SCENARIO_KEY, next)
  } catch {
    /* ignore */
  }
}

/** Returns true the first time a scenario side effect runs, false afterwards. */
export function consumeOnce(flag: string): boolean {
  if (db.consumed.includes(flag)) return false
  db.consumed.push(flag)
  saveDb()
  return true
}

/* ---------- Change notifications (consumed by the Socket.IO mock) ---------- */

type DbEvent =
  | { type: 'nft.updated'; nftId: string }
  | { type: 'order.updated'; orderId: string }

const listeners = new Set<(event: DbEvent) => void>()

export function onDbEvent(listener: (event: DbEvent) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(event: DbEvent) {
  listeners.forEach((listener) => listener(event))
}

export function nextEventId(): string {
  db.eventSeq += 1
  saveDb()
  return `evt_${String(db.eventSeq).padStart(6, '0')}`
}

/* ---------- Simulated e-mail ---------- */

const outboxListeners = new Set<(message: OutboxMessage) => void>()

export function onOutboxMessage(listener: (message: OutboxMessage) => void): () => void {
  outboxListeners.add(listener)
  return () => {
    outboxListeners.delete(listener)
  }
}

export function sendMail(message: Omit<OutboxMessage, 'id' | 'sentAt'>): OutboxMessage {
  const full: OutboxMessage = { ...message, id: `mail_${db.outbox.length + 1}`, sentAt: new Date().toISOString() }
  db.outbox = [...db.outbox, full].slice(-20)
  saveDb()
  outboxListeners.forEach((listener) => listener(full))
  return full
}

/* ---------- Projections ---------- */

export function toNftSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    image: artworkImage(nft.artwork),
    imageAlt: artworkAltText(nft.artwork, nft.name),
    priceEth: nft.priceEth,
    compareAtEth: nft.compareAtEth,
    category: nft.category,
    network: nft.network,
    collection: nft.collection,
    rare: nft.rare,
    soldOut: nft.editions.every((edition) => edition.available === 0),
    version: nft.version,
  }
}

export function toNftDetail(nft: NftRecord): NftDetail {
  const summary = toNftSummary(nft)
  return {
    ...summary,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${
      nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'
    }, com arte desbloqueável e acesso para colecionadores.`,
    longDescription: [
      `${nft.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${nft.creator} recebe ${nft.royaltyPct}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    gallery: artworkGallery(nft.artwork, nft.name),
    attributes: artworkAttributeList(nft.artwork),
    rating: nft.rating,
    reviewsCount: nft.reviews.length,
    reviews: nft.reviews,
    creator: nft.creator,
    royaltyPct: nft.royaltyPct,
    contract: nft.contract,
    standard: 'ERC-721',
    editions: nft.editions,
  }
}

/* ---------- NFT mutations ---------- */

export function updateNft(
  nftId: string,
  patch: { priceEth?: string; compareAtEth?: string | null; editions?: { id: EditionId; available: number }[] },
): NftRecord | null {
  const nft = db.nfts[nftId]
  if (!nft) return null
  if (patch.priceEth !== undefined) nft.priceEth = patch.priceEth
  if (patch.compareAtEth !== undefined) nft.compareAtEth = patch.compareAtEth
  for (const change of patch.editions ?? []) {
    const edition = nft.editions.find((item) => item.id === change.id)
    if (edition) edition.available = Math.max(0, change.available)
  }
  nft.version += 1
  saveDb()
  notify({ type: 'nft.updated', nftId })
  return nft
}

/* ---------- Cart ---------- */

export function cartOwnerFor(userId: string | null, guestCartId: string | null): string {
  return userId ? `user:${userId}` : `guest:${guestCartId ?? 'anonymous'}`
}

export function getCartRecord(owner: string): CartRecord {
  if (!db.carts[owner]) {
    db.carts[owner] = { items: [], couponCode: null, version: 0, updatedAt: new Date().toISOString() }
  }
  return db.carts[owner]
}

export function touchCart(cart: CartRecord): void {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
  saveDb()
}

export function toCart(owner: string): Cart {
  const cart = getCartRecord(owner)
  const items: CartLine[] = []
  for (const item of cart.items) {
    const nft = db.nfts[item.nftId]
    if (!nft) continue
    const edition = nft.editions.find((entry) => entry.id === item.editionId)
    const available = edition?.available ?? 0
    items.push({
      id: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      name: nft.name,
      tokenId: nft.tokenId,
      image: artworkImage(nft.artwork, 'thumb'),
      imageAlt: artworkAltText(nft.artwork, nft.name),
      unitPriceEth: nft.priceEth,
      available,
      maxQuantity: Math.min(available, edition?.maxPerOrder ?? 0),
      nftVersion: nft.version,
    })
  }
  return { items, couponCode: cart.couponCode, version: cart.version, updatedAt: cart.updatedAt }
}

/* ---------- Coupons & quotes ---------- */

export const coupons: Record<string, { percent: number; label: string; expired?: boolean }> = {
  KURIO10: { percent: 10, label: '10% de desconto no lançamento' },
  GENESIS25: { percent: 25, label: '25% de desconto gênesis' },
  VERAO2025: { percent: 15, label: 'Campanha de verão 2025', expired: true },
}

export type CouponCheck = { ok: true; percent: number; label: string } | { ok: false; code: 'COUPON_INVALID' | 'COUPON_EXPIRED' }

export function checkCoupon(code: string): CouponCheck {
  const coupon = coupons[code.trim().toUpperCase()]
  if (!coupon) return { ok: false, code: 'COUPON_INVALID' }
  if (coupon.expired) return { ok: false, code: 'COUPON_EXPIRED' }
  return { ok: true, percent: coupon.percent, label: coupon.label }
}

export const networkFees: Record<NetworkId, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.0008',
}

function hashString(input: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

export function stableHash(value: unknown): string {
  return hashString(JSON.stringify(value))
}

export function buildQuote(
  owner: string,
  items: QuoteItemInput[],
  couponCode: string | null,
  network: NetworkId = 'ethereum',
): Quote {
  const lines: QuoteLine[] = []
  const issues: QuoteIssue[] = []

  for (const item of items) {
    const nft = db.nfts[item.nftId]
    if (!nft) {
      issues.push({ type: 'UNAVAILABLE', nftId: item.nftId, editionId: item.editionId, message: 'NFT não encontrado.' })
      continue
    }
    const edition = nft.editions.find((entry) => entry.id === item.editionId)
    const available = edition?.available ?? 0
    if (available === 0) {
      issues.push({
        type: 'UNAVAILABLE',
        nftId: nft.id,
        editionId: item.editionId,
        message: `${nft.name} (${edition?.label ?? item.editionId}) esgotou.`,
      })
    } else if (item.quantity > available) {
      issues.push({
        type: 'INSUFFICIENT_QUANTITY',
        nftId: nft.id,
        editionId: item.editionId,
        message: `${nft.name} (${edition?.label}) tem apenas ${available} disponível(is).`,
      })
    }
    lines.push({
      nftId: nft.id,
      editionId: item.editionId,
      name: nft.name,
      tokenId: nft.tokenId,
      image: artworkImage(nft.artwork, 'thumb'),
      imageAlt: artworkAltText(nft.artwork, nft.name),
      quantity: item.quantity,
      unitPriceEth: nft.priceEth,
      lineTotalEth: multiplyMoney(nft.priceEth, item.quantity),
      available,
      nftVersion: nft.version,
    })
  }

  let coupon: Quote['coupon'] = null
  if (couponCode) {
    const check = checkCoupon(couponCode)
    if (check.ok) coupon = { code: couponCode.toUpperCase(), percent: check.percent, label: check.label }
    else
      issues.push({
        type: check.code,
        message: check.code === 'COUPON_EXPIRED' ? 'O cupom expirou.' : 'Cupom inválido.',
      })
  }

  const subtotalEth = sumMoney(lines.map((line) => line.lineTotalEth))
  const discountEth = coupon ? percentOf(subtotalEth, coupon.percent) : '0'
  const networkFeeEth = lines.length ? networkFees[network] : '0'
  const totalEth = addMoney(subtractMoney(subtotalEth, discountEth), networkFeeEth)
  const hash = stableHash({
    lines: lines.map((line) => [line.nftId, line.editionId, line.quantity, line.unitPriceEth, line.available > 0]),
    coupon: coupon?.code ?? null,
    networkFeeEth,
  })
  const now = Date.now()
  const quote: Quote = {
    id: `quo_${hash}_${now.toString(36)}`,
    hash,
    lines,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    coupon,
    issues,
    network,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
  }
  db.quotes[quote.id] = { ...quote, owner }
  // keep the quote table small
  const ids = Object.keys(db.quotes)
  if (ids.length > 60) ids.slice(0, ids.length - 60).forEach((id) => delete db.quotes[id])
  saveDb()
  return quote
}

/* ---------- Orders ---------- */

export const ORDER_SETTLE_DELAY_MS = 2500
const settleTimers = new Map<string, number>()

export function toOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    status: record.status,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    txHash: record.txHash,
    explorerUrl: record.explorerUrl,
    rejectionReason: record.rejectionReason,
    lines: record.lines,
    subtotalEth: record.subtotalEth,
    discountEth: record.discountEth,
    networkFeeEth: record.networkFeeEth,
    totalEth: record.totalEth,
    couponCode: record.couponCode,
    network: record.network,
    wallet: record.wallet,
  }
}

/** Deterministic transaction hash in the real Ethereum format: 0x + 64 hex chars. */
export function simulatedTxHash(order: { id: string; idempotencyKey: string }): string {
  const hex = [0, 1, 2, 3, 4].map((part) => stableHash({ id: order.id, key: order.idempotencyKey, part })).join('')
  return `0x${hex.slice(0, 64).toLowerCase()}`
}

/** Block number derived from the hash, so the explorer shows stable data. */
export function simulatedBlockNumber(txHash: string): number {
  return 6_000_000 + (parseInt(txHash.slice(2, 8), 16) % 900_000)
}

export function settleOrder(orderId: string): void {
  const order = db.orders[orderId]
  if (!order || order.status !== 'pending') return
  const now = new Date().toISOString()
  order.version += 1
  order.updatedAt = now

  if (order.outcome === 'confirmed') {
    const txHash = simulatedTxHash(order)
    order.status = 'confirmed'
    order.txHash = txHash
    // Simulated in-app explorer: the transaction does not exist on a real network.
    order.explorerUrl = `/explorador/tx/${txHash}`
    // Remove exactly the purchased quantities from the buyer's cart.
    const cart = getCartRecord(order.cartOwner)
    for (const line of order.lines) {
      const item = cart.items.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
      if (!item) continue
      item.quantity -= line.quantity
    }
    cart.items = cart.items.filter((item) => item.quantity > 0)
    if (cart.items.length === 0) cart.couponCode = null
    touchCart(cart)
  } else {
    order.status = 'rejected'
    order.rejectionReason = 'A rede recusou o pagamento (saldo insuficiente na carteira simulada).'
    // Release the reserved units.
    for (const line of order.lines) {
      const nft = db.nfts[line.nftId]
      const edition = nft?.editions.find((entry) => entry.id === line.editionId)
      if (nft && edition) updateNft(nft.id, { editions: [{ id: edition.id, available: edition.available + line.quantity }] })
    }
  }
  saveDb()
  notify({ type: 'order.updated', orderId })
}

export function scheduleSettlement(order: OrderRecord): void {
  if (order.status !== 'pending' || settleTimers.has(order.id)) return
  const wait = Math.max(0, order.settleAt - Date.now())
  const timer = window.setTimeout(() => {
    settleTimers.delete(order.id)
    settleOrder(order.id)
  }, wait)
  settleTimers.set(order.id, timer)
}

/** Settle orders whose time has come and re-arm timers after a page reload. */
export function resumePendingOrders(): void {
  for (const order of Object.values(db.orders)) {
    if (order.status !== 'pending') continue
    if (order.settleAt <= Date.now()) settleOrder(order.id)
    else scheduleSettlement(order)
  }
}

export function settleAllNow(): void {
  for (const [id, timer] of settleTimers) {
    window.clearTimeout(timer)
    settleTimers.delete(id)
  }
  Object.values(db.orders)
    .filter((order) => order.status === 'pending')
    .forEach((order) => settleOrder(order.id))
}

export function clearSettlementTimers(): void {
  settleTimers.forEach((timer) => window.clearTimeout(timer))
  settleTimers.clear()
}

/* ---------- Passwords ---------- */

export async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
