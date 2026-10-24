import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  profileSchema,
  walletConnectionSchema,
  walletsResponseSchema,
  type PasswordChangeInput,
  type ProfileInput,
  type Session,
  type WalletInput,
  type WalletSlot,
  type WalletsResponse,
} from '@/contracts/account'
import type { NetworkId } from '@/contracts/nft'
import { httpClient, request } from '@/lib/http/client'
import { queryKeys } from '@/lib/query/keys'
import { useSession } from '@/features/auth/session'

const accountApi = {
  profile: (signal?: AbortSignal) => request(profileSchema, { url: '/profile', signal }),
  updateProfile: (input: ProfileInput) => request(profileSchema, { method: 'PATCH', url: '/profile', data: input }),
  uploadAvatar: (dataUrl: string) =>
    request(profileSchema, { method: 'POST', url: '/profile/avatar', data: { dataUrl } }),
  removeAvatar: () => request(profileSchema, { method: 'DELETE', url: '/profile/avatar' }),
  changePassword: (input: PasswordChangeInput) => httpClient.post('/profile/password', input).then(() => undefined),
  wallets: (signal?: AbortSignal) => request(walletsResponseSchema, { url: '/wallets', signal }),
  saveWallet: (slot: WalletSlot, input: WalletInput) =>
    request(walletsResponseSchema, { method: 'PUT', url: `/wallets/${slot}`, data: input }),
  setSecondarySame: (enabled: boolean) =>
    request(walletsResponseSchema, { method: 'POST', url: '/wallets/secondary/same-as-primary', data: { enabled } }),
  connect: (walletId: string, network: NetworkId) =>
    request(walletConnectionSchema, { method: 'POST', url: `/wallets/${walletId}/connect`, data: { network } }),
  disconnect: (walletId: string) =>
    request(walletConnectionSchema, { method: 'POST', url: `/wallets/${walletId}/disconnect` }),
}

function useUserId() {
  const { user } = useSession()
  return user?.id ?? 'anonymous'
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: ({ signal }) => accountApi.profile(signal),
    enabled: userId !== 'anonymous',
  })
}

/** Keeps the session's user summary (header, menu) in sync with the profile. */
function useProfileMutation<T>(mutationFn: (variables: T) => ReturnType<typeof accountApi.profile>) {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(userId), profile)
      queryClient.setQueryData<Session | null>(queryKeys.session, (session) =>
        session
          ? {
              ...session,
              user: {
                ...session.user,
                displayName: profile.displayName,
                username: profile.username,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
              },
            }
          : session,
      )
    },
  })
}

export const useUpdateProfile = () => useProfileMutation((input: ProfileInput) => accountApi.updateProfile(input))
export const useUploadAvatar = () => useProfileMutation((dataUrl: string) => accountApi.uploadAvatar(dataUrl))
export const useRemoveAvatar = () => useProfileMutation<void>(() => accountApi.removeAvatar())

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChangeInput) => accountApi.changePassword(input) })
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.wallets(userId),
    queryFn: ({ signal }) => accountApi.wallets(signal),
    enabled: userId !== 'anonymous',
  })
}

function useWalletsMutation<T>(mutationFn: (variables: T) => Promise<WalletsResponse>) {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn,
    onSuccess: (data) => queryClient.setQueryData(queryKeys.wallets(userId), data),
  })
}

export const useSaveWallet = () =>
  useWalletsMutation(({ slot, input }: { slot: WalletSlot; input: WalletInput }) => accountApi.saveWallet(slot, input))

export const useSetSecondarySame = () => useWalletsMutation((enabled: boolean) => accountApi.setSecondarySame(enabled))

/** Simulated wallet connection (approve / refuse / disconnect). */
export function useWalletConnection() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  const update = (walletId: string, status: 'connected' | 'disconnected') =>
    queryClient.setQueryData<WalletsResponse>(queryKeys.wallets(userId), (data) =>
      data ? { ...data, connections: { ...data.connections, [walletId]: status } } : data,
    )
  const connect = useMutation({
    mutationFn: ({ walletId, network }: { walletId: string; network: NetworkId }) => accountApi.connect(walletId, network),
    onSuccess: (result) => update(result.walletId, 'connected'),
  })
  const disconnect = useMutation({
    mutationFn: (walletId: string) => accountApi.disconnect(walletId),
    onSuccess: (result) => update(result.walletId, 'disconnected'),
  })
  return { connect, disconnect }
}
