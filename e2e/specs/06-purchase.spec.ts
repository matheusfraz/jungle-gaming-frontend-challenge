import { addToCartFromDetail, cards, confirmButton, expect, login, openApp, reachReview, test, USERS } from '../support/fixtures'

test.describe('6. Compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await openApp(page, '/')
    await cards(page).filter({ hasText: 'Ivory Baron #088' }).getByRole('link').click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ivory Baron #088' })).toBeVisible()
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)

    await reachReview(page)
    await expect(page.getByTestId('summary-total')).toHaveText('3.596 ETH')
    await confirmButton(page).click()

    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await mocks.settleOrders()

    const receipt = page.getByTestId('order-receipt')
    await expect(receipt).toBeVisible()
    await expect(receipt.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(receipt.getByText('Ivory Baron #088')).toBeVisible()
    await expect(receipt.getByText('(x 2)')).toBeVisible()
    await expect(receipt.getByTestId('receipt-total')).toHaveText('3.596 ETH')
    await expect(receipt.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)

    // Purchased quantities left the cart.
    await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', 'Carrinho, 0 itens')

    // The receipt is a snapshot: later catalog changes do not alter it.
    await mocks.updateNft('ivory-baron-088', { priceEth: '9.99' })
    await page.reload()
    await expect(page.getByTestId('receipt-total')).toHaveText('3.596 ETH')
  })

  test('remove do carrinho só os itens e quantidades comprados', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'golden-beat-207', 2)
    await reachReview(page)
    // While reviewing, the user adds one more unit in another tab-like flow.
    const status = await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('kurio:token') ?? 'null')
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nftId: 'golden-signal-160', editionId: '1-50', quantity: 1 }),
      })
      return `${response.status} ${await response.text()}`
    })
    expect(status).toMatch(/^201/)
    await confirmButton(page).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await mocks.settleOrders()
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    await page.keyboard.press('Escape')
    await openApp(page, '/carrinho')
    await expect(page.getByTestId('cart-row')).toHaveCount(1)
    await expect(page.getByTestId('cart-row')).toContainText('Golden Signal #160')
  })
})
