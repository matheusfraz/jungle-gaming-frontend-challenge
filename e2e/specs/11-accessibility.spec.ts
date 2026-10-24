import { expect, isMobile, openApp, test } from '../support/fixtures'

test.describe('11. Teclado, foco de diálogos e validação de formulários', () => {
  test('link de pular conteúdo e foco visível', async ({ page }) => {
    await openApp(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('diálogo de busca prende e devolve o foco', async ({ page }) => {
    await openApp(page, '/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Termo de busca')).toBeFocused()

    // Focus stays inside the dialog while tabbing.
    for (let index = 0; index < 5; index += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('formulário de login: erros associados aos campos', async ({ page }) => {
    await openApp(page, '/entrar')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = dialog.getByPlaceholder('contato@email.com')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(/E-mail é obrigatório/)

    await email.fill('nao-e-email')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByText('Informe um e-mail válido.')).toBeVisible()
  })

  test('catálogo operável pelo teclado (filtro e navegação para o NFT)', async ({ page }) => {
    test.skip(isMobile(page), 'no mobile os filtros ficam em um drawer, coberto na spec 1')
    await openApp(page, '/mercado')
    const music = page.getByRole('complementary').getByRole('button', { name: /Música/ })
    await music.focus()
    await page.keyboard.press('Enter')
    await expect(music).toHaveAttribute('aria-pressed', 'true')
    const firstCardLink = page.getByTestId('nft-grid').getByRole('link').first()
    await firstCardLink.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nft\//)
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('newsletter valida e informa o resultado', async ({ page }) => {
    await openApp(page, '/')
    const input = page.getByLabel('E-mail para receber lançamentos')
    await input.fill('invalido')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await input.fill('fa@kurio.test')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Pronto! Você receberá nossos próximos lançamentos.')).toBeVisible()
  })
})
