import type { Socket } from 'socket.io-client'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from '@/contracts/commerce'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

type EventMap = {
  'nft.updated': NftUpdatedEvent
  'order.updated': OrderUpdatedEvent
}
type Handler<K extends keyof EventMap> = (event: EventMap[K]) => void

const MAX_SEEN = 500
/** Socket.IO endpoint path (the real server and the mock both listen here). */
export const REALTIME_PATH = '/realtime'

/**
 * Single Socket.IO connection for the app.
 *
 * Guarantees:
 * - duplicate events (same id) are applied once;
 * - events with a version <= the last applied version of that resource are dropped;
 * - order events are only accepted for the user of the current session;
 * - after a reconnect, `onReconnect` listeners reconcile state with REST.
 */
class RealtimeClient {
  private socket: Socket | null = null
  private status: ConnectionStatus = 'idle'
  private statusListeners = new Set<() => void>()
  private handlers: { [K in keyof EventMap]: Set<Handler<K>> } = {
    'nft.updated': new Set(),
    'order.updated': new Set(),
  }
  private reconnectListeners = new Set<() => void>()
  private seen = new Set<string>()
  private versions = new Map<string, number>()
  private token: string | null = null
  private userId: string | null = null
  private hasConnectedOnce = false

  private connecting = false

  /**
   * socket.io-client is loaded on demand: engine.io captures the global
   * WebSocket when its module is evaluated, so it must load after the mock
   * layer (when enabled) has installed its WebSocket interception. It also
   * keeps the realtime stack out of the initial bundle.
   */
  async connect() {
    if (this.socket || this.connecting) return
    this.connecting = true
    const { io } = await import('socket.io-client')
    const socket = io(window.location.origin, {
      path: REALTIME_PATH,
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 8000,
    })
    this.socket = socket
    this.setStatus('connecting')

    socket.on('connect', () => {
      const isReconnect = this.hasConnectedOnce
      this.hasConnectedOnce = true
      this.setStatus('connected')
      this.subscribe()
      if (isReconnect) this.reconnectListeners.forEach((listener) => listener())
    })
    socket.on('disconnect', () => this.setStatus('reconnecting'))
    socket.on('connect_error', () => this.setStatus('reconnecting'))

    socket.on('nft.updated', (payload: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (!parsed.success || !this.accept(parsed.data.id, `nft:${parsed.data.resource.id}`, parsed.data.version)) return
      this.handlers['nft.updated'].forEach((handler) => handler(parsed.data))
    })

    socket.on('order.updated', (payload: unknown) => {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (!parsed.success) return
      // Never let another (previous) user's event touch this session.
      if (!this.userId || parsed.data.userId !== this.userId) return
      if (!this.accept(parsed.data.id, `order:${parsed.data.resource.id}`, parsed.data.version)) return
      this.handlers['order.updated'].forEach((handler) => handler(parsed.data))
    })
  }

  /** Called on login, logout and user switch. */
  setSession(token: string | null, userId: string | null) {
    const changed = userId !== this.userId
    this.token = token
    this.userId = userId
    if (changed) {
      // Forget order versions from the previous session.
      for (const key of [...this.versions.keys()]) if (key.startsWith('order:')) this.versions.delete(key)
    }
    if (this.socket?.connected) this.subscribe()
  }

  private subscribe() {
    if (!this.socket) return
    if (this.token) this.socket.emit('session:subscribe', { token: this.token })
    else this.socket.emit('session:unsubscribe')
  }

  /** Records the version a resource is known to be at (e.g. from a REST response). */
  noteVersion(resourceKey: string, version: number) {
    const current = this.versions.get(resourceKey) ?? -1
    if (version > current) this.versions.set(resourceKey, version)
  }

  private accept(eventId: string, resourceKey: string, version: number): boolean {
    if (this.seen.has(eventId)) return false
    this.seen.add(eventId)
    if (this.seen.size > MAX_SEEN) {
      const oldest = this.seen.values().next().value
      if (oldest) this.seen.delete(oldest)
    }
    const current = this.versions.get(resourceKey) ?? -1
    if (version <= current) return false
    this.versions.set(resourceKey, version)
    return true
  }

  on<K extends keyof EventMap>(type: K, handler: Handler<K>): () => void {
    this.handlers[type].add(handler)
    return () => {
      this.handlers[type].delete(handler)
    }
  }

  onReconnect(listener: () => void): () => void {
    this.reconnectListeners.add(listener)
    return () => {
      this.reconnectListeners.delete(listener)
    }
  }

  getStatus = () => this.status

  subscribeStatus = (listener: () => void) => {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private setStatus(next: ConnectionStatus) {
    if (next === this.status) return
    this.status = next
    this.statusListeners.forEach((listener) => listener())
  }
}

export const realtime = new RealtimeClient()
