import { addToCartFromDetail, confirmButton, expect, login, reachReview, test, USERS } from '../support/fixtures'

test.describe('9. Preço/disponibilidade via Socket.IO durante o checkout', () => {
  test('carrinho aberto recebe a mudança de preço e atualiza o resumo', async ({ page, mocks }) => {
    await addToCartFromDetail(page, 'emerald-ape-042')
    await expect(page.getByTestId('summary-total')).toHaveText('1.206 ETH')

    await mocks.updateNft('emerald-ape-042', { priceEth: '1.50' })

    await expect(page.getByTestId('cart-notices')).toContainText('O preço de Emerald Ape #042 mudou de 1.19 ETH para 1.50 ETH.')
    await expect(page.getByTestId('summary-total')).toHaveText('1.516 ETH')
    await expect(page.getByTestId('live-polite')).toContainText('O resumo do carrinho foi atualizado.')
  })

  test('edição esgotada no carrinho bloqueia o checkout', async ({ page, mocks }) => {
    await addToCartFromDetail(page, 'emerald-ape-042')
    await mocks.updateNft('emerald-ape-042', { editions: [{ id: '1-50', available: 0 }] })
    await expect(page.getByTestId('cart-notices')).toContainText('esgotou')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('revisão desatualizada impede a confirmação até nova revisão', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'emerald-ape-042')
    await reachReview(page)
    await expect(page.getByTestId('summary-total')).toHaveText('1.206 ETH')

    await mocks.updateNft('emerald-ape-042', { priceEth: '1.50' })

    await expect(page.getByText(/Os valores mudaram desde a sua revisão/)).toBeVisible()
    await expect(confirmButton(page)).toBeDisabled()

    await page.getByRole('button', { name: 'Atualizar revisão' }).click()
    await expect(page.getByText(/Valores atualizados: Emerald Ape #042: 1.19 ETH → 1.50 ETH/)).toBeVisible()
    await expect(page.getByTestId('summary-total')).toHaveText('1.516 ETH')
    await expect(confirmButton(page)).toBeEnabled()
    await confirmButton(page).click()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    await mocks.settleOrders()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.516 ETH')
  })

  test.describe('mudança no servidor entre a revisão e o envio', () => {
    test.use({ scenario: 'checkout-price-change' })
    test('API recusa a cotação antiga e exige nova confirmação', async ({ page, mocks }) => {
      await login(page, USERS.ana)
      await addToCartFromDetail(page, 'emerald-ape-042')
      await reachReview(page)
      await confirmButton(page).click()

      await expect(page.getByText(/Valores atualizados: Emerald Ape #042: 1.19 ETH → 1.24 ETH/)).toBeVisible()
      await expect(page.getByTestId('summary-total')).toHaveText('1.256 ETH')
      expect(await mocks.listOrders()).toHaveLength(0)

      await confirmButton(page).click()
      await expect(page).toHaveURL(/\/pedido\/ord_/)
      expect(await mocks.listOrders()).toHaveLength(1)
    })
  })

  test.describe('edição esgota no servidor durante o envio', () => {
    test.use({ scenario: 'checkout-sold-out' })
    test('pedido não é criado e o usuário é levado a ajustar o carrinho', async ({ page, mocks }) => {
      await login(page, USERS.ana)
      await addToCartFromDetail(page, 'emerald-ape-042')
      await reachReview(page)
      await confirmButton(page).click()
      await expect(page.getByText('Um ou mais itens não estão mais disponíveis.').first()).toBeVisible()
      await expect(confirmButton(page)).toBeDisabled()
      await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
      expect(await mocks.listOrders()).toHaveLength(0)
    })
  })
})
