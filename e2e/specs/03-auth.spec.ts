import { expect, login, loginForm, logout, openApp, registerForm, test, USERS } from '../support/fixtures'

test.describe('3. Cadastro, login, expiração, logout e troca de usuário', () => {
  test('cadastro valida campos, trata conflito, confirma o e-mail e autentica', async ({ page, mocks }) => {
    await openApp(page, '/cadastro')
    const dialog = registerForm(page)

    // Client-side validation
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText('Nome de usuário é obrigatório.')).toBeVisible()
    await expect(dialog.getByPlaceholder('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    // Server-side conflict (e-mail already registered)
    await dialog.getByPlaceholder('Nome de usuário').fill('nova_conta')
    await dialog.getByPlaceholder('Digite seu e-mail').fill(USERS.ana.email)
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('Segura123')
    await dialog.getByPlaceholder('Confirmar senha').fill('Segura123')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    // Fix the e-mail: the API sends a confirmation code instead of creating the account.
    await dialog.getByPlaceholder('Digite seu e-mail').fill('nova@kurio.test')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    const verify = page.getByTestId('verify-email')
    await expect(verify.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
    await expect(verify).toContainText('nova@kurio.test')
    await expect(verify.getByRole('button', { name: /Reenviar código em \d+ s/ })).toBeDisabled()
    expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull()

    // The pending step survives a refresh.
    await page.reload()
    await expect(page.getByTestId('verify-email')).toBeVisible()

    // Wrong code, then the code from the simulated inbox.
    const code = await mocks.latestCode('nova@kurio.test')
    const wrong = code === '000000' ? '111111' : '000000'
    const codeInput = page.getByLabel('Código de confirmação')
    await codeInput.fill(wrong)
    await page.getByRole('button', { name: 'Confirmar e criar conta' }).click()
    await expect(page.getByText(/Código incorreto\. Você tem mais 4 tentativa/).first()).toBeVisible()
    await expect(codeInput).toHaveAttribute('aria-invalid', 'true')

    await codeInput.fill(code)
    await page.getByRole('button', { name: 'Confirmar e criar conta' }).click()
    await page.waitForFunction(() => Boolean(localStorage.getItem('kurio:token')))
    await expect(page).not.toHaveURL(/\/cadastro/)

    // Session survives refresh
    await page.reload()
    await openApp(page, '/perfil')
    await expect(page.locator('main').getByLabel('E-mail')).toHaveValue('nova@kurio.test')
  })

  test('código expirado e reenvio (relógio controlado)', async ({ page, mocks }) => {
    await page.clock.install()
    await openApp(page, '/cadastro')
    const dialog = registerForm(page)
    await dialog.getByPlaceholder('Nome de usuário').fill('relogio_teste')
    await dialog.getByPlaceholder('Digite seu e-mail').fill('relogio@kurio.test')
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('Segura123')
    await dialog.getByPlaceholder('Confirmar senha').fill('Segura123')
    await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page.getByTestId('verify-email')).toBeVisible()
    const firstCode = await mocks.latestCode('relogio@kurio.test')

    // 11 minutes later the code is no longer accepted.
    await page.clock.fastForward(11 * 60_000)
    await page.getByLabel('Código de confirmação').fill(firstCode)
    await page.getByRole('button', { name: 'Confirmar e criar conta' }).click()
    await expect(page.getByText('O código expirou. Peça um novo código.').first()).toBeVisible()

    // Resend is available again; the new code works.
    await page.getByRole('button', { name: 'Reenviar código', exact: true }).click()
    await expect(page.getByText('Novo código enviado.')).toBeVisible()
    await expect.poll(() => mocks.inbox('relogio@kurio.test').then((messages) => messages.length)).toBe(2)
    await page.getByLabel('Código de confirmação').fill(await mocks.latestCode('relogio@kurio.test'))
    await page.getByRole('button', { name: 'Confirmar e criar conta' }).click()
    await page.waitForFunction(() => Boolean(localStorage.getItem('kurio:token')))
    await expect(page).not.toHaveURL(/\/cadastro/)
  })

  test('login inválido mostra erro e login válido retorna ao fluxo anterior', async ({ page }) => {
    await openApp(page, '/perfil/carteiras')
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
    const dialog = loginForm(page)
    await dialog.getByPlaceholder('contato@email.com').fill(USERS.ana.email)
    await dialog.getByPlaceholder('Senha').fill('errada123')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByText('E-mail ou senha incorretos.')).toBeVisible()

    await dialog.getByPlaceholder('Senha').fill(USERS.ana.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/perfil\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('sessão expirada redireciona ao login preservando o contexto', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await openApp(page, '/perfil')
    await expect(page.locator('main').getByLabel('Nome de exibição')).toHaveValue('Ana Souza')

    await mocks.expireSessions()
    await page.getByRole('button', { name: 'Salvar' }).click()

    await expect(page).toHaveURL(/\/entrar\?.*reason=expired/)
    await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()
    const dialog = loginForm(page)
    await dialog.getByPlaceholder('contato@email.com').fill(USERS.ana.email)
    await dialog.getByPlaceholder('Senha').fill(USERS.ana.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test.describe('expiração pelo relógio', () => {
    test.use({ scenario: 'session-expired' })
    test('sessão curta expira após 20 s (relógio controlado)', async ({ page }) => {
      await page.clock.install()
      await login(page, USERS.ana)
      await openApp(page, '/perfil')
      await expect(page.locator('main').getByLabel('Nome de exibição')).toHaveValue('Ana Souza')
      await page.clock.fastForward(25_000)
      await page.getByRole('button', { name: 'Salvar' }).click()
      await expect(page).toHaveURL(/reason=expired/)
    })
  })

  test('logout e troca de usuário limpam dados privados', async ({ page }) => {
    await login(page, USERS.ana)
    await openApp(page, '/perfil/favoritos')
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(2)

    await logout(page)
    await expect(page).toHaveURL(/\/$/)
    await openApp(page, '/perfil/favoritos')
    await expect(page).toHaveURL(/\/entrar/)

    await login(page, USERS.bruno, '/entrar?redirect=%2Fperfil%2Ffavoritos')
    await expect(page).toHaveURL(/\/perfil\/favoritos$/)
    await expect(page.getByRole('heading', { name: 'Nenhum favorito ainda' })).toBeVisible()
    await openApp(page, '/perfil')
    await expect(page.locator('main').getByLabel('Nome de exibição')).toHaveValue('Bruno Lima')
  })
})
