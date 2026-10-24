import { expect, openApp, test } from '../support/fixtures'

test.describe('2. Detalhe do NFT: acesso direto e recurso inexistente', () => {
  test('acesso direto mostra galeria, edição, limite de quantidade e edição esgotada', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByTestId('nft-price')).toContainText('1.19 ETH')

    // Gallery
    await page.getByRole('button', { name: 'Ver imagem 2 de 4' }).click()
    await expect(page.getByRole('button', { name: 'Ver imagem 2 de 4' })).toHaveAttribute('aria-pressed', 'true')

    // 1/1 is sold out; 1/50 is the default edition.
    await expect(page.getByRole('button', { name: 'Edição 1/1 (esgotada)' })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByRole('button', { name: 'Edição 1/50' })).toHaveAttribute('aria-pressed', 'true')

    // 1/10 allows at most 5 per order (and has 2 units in the fixture → limit 2).
    await page.getByRole('button', { name: 'Edição 1/10' }).click()
    await expect(page).toHaveURL(/edicao=1-10/)
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await expect(plus).toBeDisabled()
    await expect(page.getByRole('group', { name: 'Quantidade' }).locator('output')).toHaveText('2')

    // Edition chosen in the URL survives refresh.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Edição 1/10' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('NFT inexistente mostra estado de recurso não encontrado', async ({ page }) => {
    await openApp(page, '/nft/nao-existe-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/mercado$/)
  })

  test('NFT totalmente esgotado bloqueia a compra', async ({ page }) => {
    await openApp(page, '/nft/silent-baron-420')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'COMPRAR' })).toBeDisabled()
  })

  test('rota inexistente mostra a página 404', async ({ page }) => {
    await openApp(page, '/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
