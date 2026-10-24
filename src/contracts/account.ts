import { z } from 'zod'
import { networkIdSchema } from './nft'

/* ---------- Shared field rules (client forms and mock server use the same ones) ---------- */

const required = (label: string) => z.string().trim().min(1, `${label} é obrigatório.`)

export const emailField = required('E-mail').pipe(z.email('Informe um e-mail válido.'))
export const usernameField = required('Nome de usuário').pipe(
  z
    .string()
    .min(3, 'Use pelo menos 3 caracteres.')
    .max(20, 'Use no máximo 20 caracteres.')
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _.'),
)
export const passwordField = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.')
export const walletAddressField = required('Endereço da carteira').pipe(
  z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Use um endereço 0x com 40 caracteres hexadecimais.'),
)
export const ensSuffixes = ['.eth', '.xyz'] as const
export const ensSuffixSchema = z.enum(ensSuffixes)
export const ensLabelField = required('Nome ENS').pipe(
  z
    .string()
    .min(3, 'Use pelo menos 3 caracteres.')
    .regex(/^[a-z0-9-]+$/, 'Use letras minúsculas, números e hífen.'),
)

/* ---------- Session ---------- */

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: z.string(),
})

export const authResponseSchema = z.object({
  token: z.string(),
  session: sessionSchema,
})

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Senha é obrigatória.'),
})

export const registerInputSchema = z
  .object({
    username: usernameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })

/* ---------- E-mail verification (sign-up) ---------- */

/** POST /auth/register answers 202 with this: the account only exists after the code is confirmed. */
export const pendingSignupSchema = z.object({
  verificationId: z.string(),
  email: z.string(),
  expiresAt: z.string(),
  resendAvailableAt: z.string(),
})

export const verifySignupInputSchema = z.object({
  verificationId: z.string().min(1),
  code: z
    .string()
    .trim()
    .min(1, 'Digite o código que enviamos para o seu e-mail.')
    .regex(/^\d{6}$/, 'O código tem 6 dígitos.'),
})

export const resendSignupInputSchema = z.object({
  verificationId: z.string().min(1),
})

/* ---------- Profile ---------- */

export const profileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: z.string(),
})

export const profileInputSchema = z.object({
  displayName: required('Nome de exibição').pipe(z.string().max(40, 'Use no máximo 40 caracteres.')),
  username: usernameField,
  email: emailField,
  ensName: ensLabelField,
  ensSuffix: ensSuffixSchema,
  walletNickname: required('Apelido da carteira').pipe(z.string().max(30, 'Use no máximo 30 caracteres.')),
})

export const avatarInputSchema = z.object({
  /** data: URL (PNG/JPEG/WebP) up to ~1 MB. */
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Envie uma imagem PNG, JPEG ou WebP.')
    .max(1_400_000, 'A imagem deve ter no máximo 1 MB.'),
})

export const passwordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })

/* ---------- Wallets ---------- */

export const walletTypes = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletTypeSchema = z.enum(walletTypes)
export const walletSlotSchema = z.enum(['primary', 'secondary'])

export const walletTypeLabels: Record<z.infer<typeof walletTypeSchema>, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletInputSchema = z.object({
  displayName: required('Nome de exibição'),
  nickname: required('Apelido da carteira').pipe(z.string().max(30, 'Use no máximo 30 caracteres.')),
  network: networkIdSchema,
  profileName: required('Nome do perfil'),
  address: walletAddressField,
  secondaryAddress: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^0x[a-fA-F0-9]{40}$/.test(value) || /^[a-z0-9-]{3,}\.(eth|xyz)$/.test(value),
      'Use um endereço 0x ou um nome ENS (ex.: kurio.eth).',
    ),
  walletType: walletTypeSchema,
  referralCode: required('Código de indicação').pipe(
    z.string().regex(/^[A-Z0-9]{6,12}$/, 'Use de 6 a 12 letras maiúsculas ou números.'),
  ),
  email: emailField,
  ensName: ensLabelField,
  ensSuffix: ensSuffixSchema,
})

export const walletSchema = walletInputSchema.extend({
  id: z.string(),
  slot: walletSlotSchema,
  updatedAt: z.string(),
})

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
  secondarySameAsPrimary: z.boolean(),
  /** Simulated wallet connection state, keyed by wallet id. */
  connections: z.record(z.string(), z.enum(['connected', 'disconnected'])),
})

export const walletConnectionSchema = z.object({
  walletId: z.string(),
  status: z.enum(['connected', 'disconnected']),
  network: networkIdSchema,
  address: z.string(),
})

export type User = z.infer<typeof userSchema>
export type Session = z.infer<typeof sessionSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type LoginInput = z.infer<typeof loginInputSchema>
export type RegisterInput = z.infer<typeof registerInputSchema>
export type PendingSignup = z.infer<typeof pendingSignupSchema>
export type VerifySignupInput = z.infer<typeof verifySignupInputSchema>
export type Profile = z.infer<typeof profileSchema>
export type ProfileInput = z.infer<typeof profileInputSchema>
export type AvatarInput = z.infer<typeof avatarInputSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>
export type WalletType = z.infer<typeof walletTypeSchema>
export type WalletSlot = z.infer<typeof walletSlotSchema>
export type WalletInput = z.infer<typeof walletInputSchema>
export type Wallet = z.infer<typeof walletSchema>
export type WalletsResponse = z.infer<typeof walletsResponseSchema>
export type WalletConnection = z.infer<typeof walletConnectionSchema>
