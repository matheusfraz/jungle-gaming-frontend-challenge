/**
 * Hints shown under wallet/collector fields. Every example passes the shared
 * zod contracts (src/contracts/account.ts) and the mock API checks, and the
 * README lists the same values.
 */
export const fieldHelp = {
  username: 'De 3 a 20 caracteres: letras minúsculas, números e _. Ex.: ana_souza',
  nickname: 'Até 30 caracteres. Ex.: Minha MetaMask',
  profileName: 'Como o perfil aparece na carteira. Ex.: Coleção da Ana',
  address: 'Formato 0x + 40 caracteres de 0-9 e a-f. Ex.: 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  secondaryAddress: 'Opcional, pode ficar em branco. Aceita um nome ENS (ex.: kurio.eth) ou outro endereço 0x.',
  referralCode: 'De 6 a 12 letras maiúsculas ou números, começando com KURIO. Ex.: KURIO2026',
  ensName: 'Só o nome, sem o sufixo: letras minúsculas, números e hífen (mín. 3). Ex.: ana-souza',
} as const

/** Referral codes are uppercase; typing "kurio2026" must also work. */
export function toReferralCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}
