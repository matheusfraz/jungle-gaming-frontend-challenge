import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/contracts/commerce'
import { db, nextEventId, onDbEvent, saveDb } from './db'

/**
 * Socket.IO server simulated with MSW's WebSocket interception and
 * @mswjs/socket.io-binding. The real `socket.io-client` in the app talks the
 * Engine.IO/Socket.IO protocol to this handler over a mocked WebSocket.
 *
 * The binding does not implement heartbeats, handshake `auth` or rooms, so:
 * - this server sends Engine.IO pings ("2") itself to keep the client alive;
 * - clients identify their session with a `session:subscribe` event;
 * - per-user delivery is done here by tracking which user each socket belongs to.
 */

type Io = ReturnType<typeof toSocketIo>

interface ClientEntry {
  io: Io
  userId: string | null
  ping: number
  close: () => void
}

const clients = new Set<ClientEntry>()
let blockedUntil = 0
let lastEvent: RealtimeEvent | null = null

// The client uses path "/realtime" (see REALTIME_PATH). Note: MSW strips a
// leading "/socket.io/" before matching, so the default path cannot be told
// apart from Vite's HMR socket — a dedicated path avoids that.
const socketLink = ws.link(/\/realtime\/(\?.*)?$/)

function deliver(event: RealtimeEvent) {
  lastEvent = event
  for (const client of clients) {
    if (event.type === 'order.updated' && client.userId !== event.userId) continue
    client.io.client.emit(event.type, event)
  }
}

export function buildNftEvent(nftId: string, overrides: Partial<NftUpdatedEvent> = {}): NftUpdatedEvent | null {
  const nft = db.nfts[nftId]
  if (!nft) return null
  return {
    id: nextEventId(),
    type: 'nft.updated',
    occurredAt: new Date().toISOString(),
    version: nft.version,
    resource: { type: 'nft', id: nft.id },
    data: {
      priceEth: nft.priceEth,
      compareAtEth: nft.compareAtEth,
      soldOut: nft.editions.every((edition) => edition.available === 0),
      editions: nft.editions.map((edition) => ({ id: edition.id, available: edition.available })),
    },
    ...overrides,
  }
}

function buildOrderEvent(orderId: string): OrderUpdatedEvent | null {
  const order = db.orders[orderId]
  if (!order) return null
  return {
    id: nextEventId(),
    type: 'order.updated',
    occurredAt: new Date().toISOString(),
    version: order.version,
    resource: { type: 'order', id: order.id },
    userId: order.userId,
    data: {
      status: order.status,
      txHash: order.txHash,
      explorerUrl: order.explorerUrl,
      rejectionReason: order.rejectionReason,
    },
  }
}

// Every change in the mock database is published as a realtime event.
onDbEvent((change) => {
  const event = change.type === 'nft.updated' ? buildNftEvent(change.nftId) : buildOrderEvent(change.orderId)
  if (event) deliver(event)
})

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    if (Date.now() < blockedUntil) {
      // Simulated outage: refuse the transport so socket.io-client keeps retrying.
      connection.client.close()
      return
    }

    const io = toSocketIo(connection)
    const entry: ClientEntry = {
      io,
      userId: null,
      ping: window.setInterval(() => connection.client.send('2'), 20_000),
      close: () => connection.client.close(),
    }
    clients.add(entry)

    io.client.on('session:subscribe', (_event, payload: { token?: string | null }) => {
      const session = payload?.token ? db.sessions[payload.token] : undefined
      entry.userId = session && session.expiresAt > Date.now() ? session.userId : null
      io.client.emit('session:subscribed', { userId: entry.userId })
    })

    io.client.on('session:unsubscribe', () => {
      entry.userId = null
      io.client.emit('session:subscribed', { userId: null })
    })

    connection.client.addEventListener('close', () => {
      window.clearInterval(entry.ping)
      clients.delete(entry)
    })
  }),
]

/* ---------- Controls used by the mock panel and the E2E tests ---------- */

export function emitRaw(event: RealtimeEvent): void {
  deliver(event)
}

/** Re-sends the last event with the same id (duplicate delivery). */
export function replayLastEvent(): RealtimeEvent | null {
  if (lastEvent) deliver(lastEvent)
  return lastEvent
}

/** Sends an out-of-date nft.updated (older version, bogus price). */
export function emitStaleNftEvent(nftId: string, priceEth = '0.01'): NftUpdatedEvent | null {
  const nft = db.nfts[nftId]
  if (!nft) return null
  const event = buildNftEvent(nftId, { version: Math.max(0, nft.version - 1) })
  if (!event) return null
  event.data = { ...event.data, priceEth }
  saveDb()
  deliver(event)
  return event
}

/** Drops every socket and refuses reconnections for `ms` milliseconds. */
export function dropSockets(ms = 3000): void {
  blockedUntil = Date.now() + ms
  for (const client of [...clients]) client.close()
}

export function connectedClients(): { userId: string | null }[] {
  return [...clients].map((client) => ({ userId: client.userId }))
}
