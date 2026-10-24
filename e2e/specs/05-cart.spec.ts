import { addToCartFromDetail, expect, login, openApp, test, USERS } from '../support/fixtures'

test.describe('5. Carrinho: quantidades, remoção, cupom e persistência', () => {
  test('quantidade, cupom inválido/expirado/válido e resumo coerente', async ({ page }) => {
    await addToCartFromDetail(page, 'emerald-ape-042')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.19 ETH')
    await expect(page.getByTestId('summary-fee')).toHaveText('0.016 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('1.206 ETH')

    await page.getByRole('button', { name: 'Aumentar quantidade de emerald ape #042' }).click()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')

    const coupon = page.getByLabel('Código promocional')
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toHaveText('Cupom inválido. Confira o código e tente novamente.')
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')

    await coupon.fill('VERAO2025')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.locator('#coupon-error')).toHaveText('Este cupom expirou.')

    await coupon.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('KURIO10', { exact: true })).toBeVisible()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.238 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('2.158 ETH')

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.00 ETH')
  })

  test('limite de disponibilidade por edição', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042?edicao=1-10')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByRole('button', { name: /Aumentar quantidade de/ })).toBeDisabled()
  })

  test('carrinho do visitante persiste após refresh e é preservado ao entrar', async ({ page }) => {
    await addToCartFromDetail(page, 'golden-beat-207', 3)
    await page.reload()
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
    await expect(page.getByRole('group', { name: /Quantidade de Golden Beat/ }).locator('output')).toHaveText('3')

    await login(page, USERS.ana, '/entrar?redirect=%2Fcarrinho')
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
    await expect(page.getByTestId('cart-row')).toContainText('Golden Beat #207')
    await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', 'Carrinho, 3 itens')

    await page.getByRole('button', { name: 'Remover Golden Beat #207 do carrinho' }).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })
})
