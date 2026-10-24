import { buyButton, cards, expect, openApp, test } from '../support/fixtures'

test.describe('12. Skeletons, falhas e recuperação', () => {
  test.describe('rede lenta', () => {
    test.use({ scenario: 'slow' })
    test('skeletons aparecem no catálogo, detalhe e resumo do carrinho', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByTestId('nft-card-skeleton').first()).toBeVisible()
      await expect(cards(page).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('nft-card-skeleton')).toHaveCount(0)

      await page.goto('/nft/emerald-ape-042')
      await expect(page.getByLabel('Carregando NFT')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 15_000 })

      await buyButton(page).click()
      await expect(page).toHaveURL(/\/carrinho$/, { timeout: 15_000 })
      await expect(page.getByTestId('order-summary')).toHaveAttribute('aria-busy', 'true')
      await expect(page.getByTestId('summary-total')).toHaveText('1.206 ETH', { timeout: 15_000 })
    })
  })

  test.describe('erro 500', () => {
    test.use({ scenario: 'server-error' })
    test('mostra o erro e recupera ao tentar novamente', async ({ page, mocks }) => {
      await openApp(page, '/mercado')
      await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo.' })).toBeVisible({
        timeout: 15_000,
      })
      await mocks.setScenario('instant')
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(cards(page)).toHaveCount(9)
    })
  })

  test.describe('sem conexão', () => {
    test.use({ scenario: 'offline' })
    test('detalhe informa a falha de rede e recupera', async ({ page, mocks }) => {
      await openApp(page, '/nft/emerald-ape-042')
      await expect(page.getByText(/Sem conexão com o servidor/)).toBeVisible({ timeout: 15_000 })
      await mocks.setScenario('instant')
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    })
  })

  test.describe('falha transitória', () => {
    test.use({ scenario: 'flaky' })
    test('a nova tentativa automática esconde o 503 do usuário', async ({ page }) => {
      await openApp(page, '/mercado')
      await expect(cards(page)).toHaveCount(9, { timeout: 15_000 })
      await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo.' })).toHaveCount(0)
    })
  })

  test.describe('catálogo vazio', () => {
    test.use({ scenario: 'empty' })
    test('mostra estado vazio', async ({ page }) => {
      await openApp(page, '/mercado')
      await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    })
  })
})
