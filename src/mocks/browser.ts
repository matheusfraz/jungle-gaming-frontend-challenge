import { setupWorker } from 'msw/browser'
import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { cartHandlers, favoriteHandlers } from './handlers/commerce'
import { nftHandlers } from './handlers/nfts'
import { orderHandlers } from './handlers/orders'
import { socketHandlers } from './socket'

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
  ...socketHandlers,
]

export const worker = setupWorker(...handlers)
