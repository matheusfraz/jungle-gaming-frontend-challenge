import { z } from 'zod'
import { networkIdSchema } from './nft'
import {
  emailField,
  ensLabelField,
  ensSuffixSchema,
  usernameField,
  walletAddressField,
  walletInputSchema,
  walletTypeSchema,
} from './account'

/**
 * "Perfil do colecionador" form on the payment screen. The same rules are
 * enforced by the mock API when the order is created.
 */
export const collectorFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Nome de exibição é obrigatório.'),
  username: usernameField,
  network: networkIdSchema,
  profileName: z.string().trim().min(1, 'Nome do perfil é obrigatório.'),
  walletAddress: walletAddressField,
  secondaryAddress: walletInputSchema.shape.secondaryAddress,
  walletType: walletTypeSchema,
  referralCode: walletInputSchema.shape.referralCode,
  email: emailField,
  ensName: ensLabelField,
  ensSuffix: ensSuffixSchema,
  note: z.string().max(500, 'Use no máximo 500 caracteres.'),
})

export type CollectorForm = z.infer<typeof collectorFormSchema>
