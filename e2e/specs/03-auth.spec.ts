import { expect, login, loginForm, logout, openApp, registerForm, test, USERS } from '../support/fixtures'

test.describe('3. Cadastro, login, expiração, logout e troca de usuário', () => {
  test('cadastro valida campos e formato do e-mail, trata conflito, cria a conta e permite entrar de novo', async ({
    page,
  }) => {
    await openApp(page, '/cadastro')
    const dialog = registerForm(page)
    const submit = dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ })

    // Client-side validation
    await submit.click()
    await expect(dialog.getByText('Nome de usuário é obrigatório.')).toBeVisible()
    await expect(dialog.getByPlaceholder('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    // Only the e-mail format is checked: these are rejected without calling the API.
    await dialog.getByPlaceholder('Nome de usuário').fill('nova_conta')
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('Segura123')
    await dialog.getByPlaceholder('Confirmar senha').fill('Segura123')
    const email = dialog.getByPlaceholder('Digite seu e-mail')
    for (const invalid of ['nova', 'nova@', 'nova@gmail', 'nova @gmail.com']) {
      await email.fill(invalid)
      await submit.click()
      await expect(dialog.getByText('Informe um e-mail válido.')).toBeVisible()
      await expect(email).toHaveAttribute('aria-invalid', 'true')
    }

    // Server-side conflict (e-mail already registered)
    await email.fill(USERS.ana.email)
    await submit.click()
    await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    // Any other well-formed e-mail creates the account and starts the session.
    await email.fill('Nova.Pessoa@Gmail.com')
    await submit.click()
    await page.waitForFunction(() => Boolean(localStorage.getItem('kurio:token')))
    await expect(page).not.toHaveURL(/\/cadastro/)

    // Session survives refresh
    await page.reload()
    await openApp(page, '/perfil')
    await expect(page.locator('main').getByLabel('E-mail')).toHaveValue('nova.pessoa@gmail.com')

    // The new account can log in again after logging out.
    await logout(page)
    await login(page, { email: 'nova.pessoa@gmail.com', password: 'Segura123' })
    await openApp(page, '/perfil')
    await expect(page.locator('main').getByLabel('Nome de usuário')).toHaveValue('nova_conta')
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
      // A background request may hit the expired session first and redirect
      // before the click; both paths must end on the login with reason=expired.
      await page
        .getByRole('button', { name: 'Salvar' })
        .click({ timeout: 5_000 })
        .catch((error: unknown) => {
          if (!/reason=expired/.test(page.url())) throw error
        })
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
