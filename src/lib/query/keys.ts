import type { NftListQuery } from '@/contracts/nft'

/**
 * Query key factory. Private data always lives under ['user', userId, ...] or
 * ['cart', owner] / ['quote', owner, ...] so it is isolated per user and can be
 * dropped in one call on logout or user switch.
 */
export const queryKeys = {
  session: ['session'] as const,
  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListQuery) => ['nfts', 'list', params] as const,
  },
  nft: (id: string) => ['nft', id] as const,
  nftRoot: ['nft'] as const,
  cart: (owner: string) => ['cart', owner] as const,
  cartRoot: ['cart'] as const,
  quote: (owner: string, signature: string) => ['quote', owner, signature] as const,
  quoteRoot: ['quote'] as const,
  user: (userId: string) => ['user', userId] as const,
  userRoot: ['user'] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
}
