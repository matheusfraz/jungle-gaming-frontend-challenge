import type { Wallet } from '@/contracts/account'

/**
 * Fictitious accounts. Passwords are never stored in clear text: each user has
 * a salt and the SHA-256 of `${salt}:${password}`.
 *
 *   ana@kurio.test   / Kurio2026  (has primary + secondary wallets, favorites)
 *   bruno@kurio.test / Kurio2026  (no wallets yet)
 */
export interface UserRecord {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  salt: string
  passwordHash: string
  ensName: string
  ensSuffix: '.eth' | '.xyz'
  walletNickname: string
  updatedAt: string
}

export const FIXTURE_PASSWORD = 'Kurio2026'

export function buildUserFixtures(): UserRecord[] {
  return [
    {
      id: 'usr_ana',
      email: 'ana@kurio.test',
      username: 'ana_coleciona',
      displayName: 'Ana Souza',
      avatarUrl: null,
      salt: 'salt_ana_01',
      passwordHash: '4c219e48f0b2e53b5da58457307564cf57792b0b8bc763edc363a0fae9ce4b02',
      ensName: 'anasouza',
      ensSuffix: '.eth',
      walletNickname: 'Cofre principal',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'usr_bruno',
      email: 'bruno@kurio.test',
      username: 'bruno_mint',
      displayName: 'Bruno Lima',
      avatarUrl: null,
      salt: 'salt_bruno_02',
      passwordHash: '7697f129e5fe7f65254164f35bb07057821d796a386a3fe4e3ae8fd9b8bb1c1f',
      ensName: 'brunolima',
      ensSuffix: '.eth',
      walletNickname: 'Carteira do Bruno',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
  ]
}

export function buildWalletFixtures(): Record<
  string,
  { primary: Wallet | null; secondary: Wallet | null; secondarySameAsPrimary: boolean }
> {
  return {
    usr_ana: {
      primary: {
        id: 'wal_ana_primary',
        slot: 'primary',
        displayName: 'Ana Souza',
        nickname: 'Cofre principal',
        network: 'ethereum',
        profileName: 'ana_coleciona',
        address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        secondaryAddress: 'anasouza.eth',
        walletType: 'metamask',
        referralCode: 'KURIOANA',
        email: 'ana@kurio.test',
        ensName: 'anasouza',
        ensSuffix: '.eth',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
      secondary: {
        id: 'wal_ana_secondary',
        slot: 'secondary',
        displayName: 'Ana Souza',
        nickname: 'Carteira de viagem',
        network: 'polygon',
        profileName: 'ana_coleciona',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        secondaryAddress: '',
        walletType: 'coinbase',
        referralCode: 'KURIOANA',
        email: 'ana@kurio.test',
        ensName: 'anaviagem',
        ensSuffix: '.eth',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
      secondarySameAsPrimary: false,
    },
    usr_bruno: { primary: null, secondary: null, secondarySameAsPrimary: false },
  }
}

export function buildFavoriteFixtures(): Record<string, string[]> {
  return {
    usr_ana: ['neon-vessel-552', 'golden-beat-207'],
    usr_bruno: [],
  }
}
