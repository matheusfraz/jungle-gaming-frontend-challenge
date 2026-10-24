import type { EditionId } from '@/contracts/nft'
import {
  clearSettlementTimers,
  db,
  getScenario,
  resetDb,
  setScenario,
  settleAllNow,
  updateNft,
} from './db'
import { resetNetworkState } from './http'
import { isScenarioId, scenarios, type ScenarioId } from './scenarios'
import { connectedClients, dropSockets, emitStaleNftEvent, replayLastEvent } from './socket'

/**
 * Control surface of the mock backend. It only changes *server* state; every
 * visible effect reaches the app through REST responses or Socket.IO events.
 * Exposed as `window.__kurioMocks` (tests, console) and used by the Mocks panel.
 */
export const mockControl = {
  scenarios,
  getScenario,
  setScenario(id: ScenarioId) {
    if (!isScenarioId(id)) throw new Error(`Unknown scenario: ${id}`)
    setScenario(id)
    resetNetworkState()
  },
  /** Restores fixtures and clears the app's local session/cart/checkout data. */
  reset(id: ScenarioId = 'default') {
    clearSettlementTimers()
    resetDb()
    mockControl.setScenario(id)
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('kurio:') && key !== 'kurio:mock-db') window.localStorage.removeItem(key)
      }
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith('kurio:') && key !== 'kurio:mock-scenario') window.sessionStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
  },
  /** Changes price and/or availability of an NFT (emits nft.updated). */
  updateNft(nftId: string, patch: { priceEth?: string; editions?: { id: EditionId; available: number }[] }) {
    const nft = updateNft(nftId, patch)
    if (!nft) throw new Error(`Unknown NFT: ${nftId}`)
    return { version: nft.version, priceEth: nft.priceEth }
  },
  getNft(nftId: string) {
    const nft = db.nfts[nftId]
    return nft ? { priceEth: nft.priceEth, version: nft.version, editions: nft.editions } : null
  },
  replayLastEvent,
  emitStaleNftEvent,
  dropSockets,
  connectedClients,
  /** Ends every active session (next authenticated call gets 401 SESSION_EXPIRED). */
  expireSessions() {
    for (const session of Object.values(db.sessions)) session.expiresAt = Date.now() - 1
  },
  settleOrders: settleAllNow,
  /** Simulated inbox: e-mails "sent" by the mock server (most recent last). */
  inbox(email?: string) {
    return db.outbox.filter((message) => !email || message.to === email.toLowerCase())
  },
  listOrders() {
    return Object.values(db.orders).map((order) => ({ id: order.id, status: order.status, userId: order.userId }))
  },
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMocks?: MockControl
  }
}
