import { addToCartFromDetail, cards, expect, login, openApp, test, USERS } from '../support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Visual regression of the four main screens with stable data ("instant"
 * scenario, fixed fixtures). The Mocks button and toasts are hidden.
 */
async function stabilize(page: Page) {
  await page.addStyleTag({
    content: `[data-testid="mock-panel-trigger"], [data-sonner-toaster] { display: none !important; }
      *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
  })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.mouse.move(0, 0)
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await openApp(page, '/')
    await expect(cards(page)).toHaveCount(9)
    await expect(page.getByText('NFT EM DESTAQUE')).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe do NFT', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Mais desta coleção')).toBeVisible()
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await addToCartFromDetail(page, 'emerald-ape-042', 2)
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')
    await stabilize(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'emerald-ape-042', 2)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page.locator('main').getByLabel('Endereço da carteira')).toHaveValue(/^0x/)
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')
    await stabilize(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
