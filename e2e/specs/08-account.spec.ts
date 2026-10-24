import { expect, login, logout, openApp, test, USERS } from '../support/fixtures'

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

test.describe('8. Perfil, avatar, senha e carteiras', () => {
  test('edição de perfil com validação, conflito e persistência', async ({ page }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/perfil')
    const main = page.locator('main')

    await main.getByLabel('Nome de usuário').fill('Nome Inválido')
    await main.getByRole('button', { name: 'Salvar' }).click()
    await expect(main.getByText('Use apenas letras minúsculas, números e _.')).toBeVisible()

    await main.getByLabel('Nome de usuário').fill('ana_coleciona')
    await main.getByRole('button', { name: 'Salvar' }).click()
    await expect(main.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await main.getByLabel('Nome de usuário').fill('bruno_novo')
    await main.getByLabel('Nome de exibição').fill('Bruno Atualizado')
    await main.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.').first()).toBeVisible()

    await page.reload()
    await expect(main.getByLabel('Nome de exibição')).toHaveValue('Bruno Atualizado')
    await expect(main.getByLabel('Nome de usuário')).toHaveValue('bruno_novo')
  })

  test('avatar: envio e remoção', async ({ page }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/perfil')
    await page.getByTestId('avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByTestId('avatar-image')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('avatar-image')).toBeVisible()
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByTestId('avatar-image')).toHaveCount(0)
  })

  test('alteração de senha valida a senha atual e passa a valer no login', async ({ page }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/perfil')
    const main = page.locator('main')
    await main.getByLabel('Senha atual').fill('errada000')
    await main.getByLabel('Nova senha', { exact: true }).fill('NovaSenha9')
    await main.getByLabel('Confirmar nova senha').fill('NovaSenha9')
    await main.getByRole('button', { name: 'Salvar' }).click()
    await expect(main.getByText('A senha atual está incorreta.').first()).toBeVisible()

    await main.getByLabel('Senha atual').fill(USERS.bruno.password)
    await main.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil e senha atualizados.').first()).toBeVisible()

    await logout(page)
    await login(page, { email: USERS.bruno.email, password: 'NovaSenha9' })
  })

  test('carteiras principal e secundária com erros de validação e da API', async ({ page }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/perfil/carteiras')
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    const primary = page.getByTestId('wallet-form-primary')

    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()

    await primary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await primary.getByLabel('Código de indicação').fill('ABCDEF12')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Código de indicação não encontrado/)).toBeVisible()

    await primary.getByLabel('Código de indicação').fill('KURIO2026')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.').first()).toBeVisible()

    // Secondary wallet with the same address is rejected by the API.
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByTestId('wallet-form-secondary')
    await secondary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await secondary.getByLabel('Código de indicação').fill('KURIO2026')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText(/já está cadastrado como carteira principal/)).toBeVisible()
    await secondary.getByLabel('Endereço da carteira').fill('0x2222222222222222222222222222222222222222')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('wallet-form-primary').getByLabel('Endereço da carteira')).toHaveValue(
      '0x1111111111111111111111111111111111111111',
    )
    await expect(page.getByTestId('wallet-form-secondary').getByLabel('Endereço da carteira')).toHaveValue(
      '0x2222222222222222222222222222222222222222',
    )
  })

  test('os exemplos mostrados nos campos (e no README) são aceitos', async ({ page }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/perfil/carteiras')
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    const primary = page.getByTestId('wallet-form-primary')
    await expect(primary.getByText(/Ex\.: 0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed/)).toBeVisible()

    await primary.getByLabel('Apelido da carteira').fill('Minha MetaMask')
    await primary.getByLabel('Nome do perfil').fill('Coleção da Ana')
    await primary.getByLabel('Endereço da carteira').fill('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    await primary.getByLabel('ENS ou carteira secundária (opcional)').fill('kurio.eth')
    // Typed in lowercase on purpose: the field stores it in uppercase.
    await primary.getByLabel('Código de indicação').fill('kurio2026')
    await primary.getByLabel('Nome ENS').fill('ana-souza')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByTestId('wallet-form-secondary')
    await secondary.getByLabel('Endereço da carteira').fill('0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359')
    await secondary.getByLabel('Código de indicação').fill('KURIO2026')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('wallet-form-primary').getByLabel('Código de indicação')).toHaveValue('KURIO2026')
  })
})
