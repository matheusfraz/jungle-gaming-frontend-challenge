import { USERS, addToCartFromDetail, confirmButton, expect, isMobile, login, reachReview, test } from '../support/fixtures'

test.describe('7. Falha de pagamento, clique repetido e timeout', () => {
  test.describe('pagamento recusado', () => {
    test.use({ scenario: 'payment-rejected' })
    test('pedido recusado preserva o carrinho', async ({ page, mocks }) => {
      await login(page, USERS.ana)
      await addToCartFromDetail(page, 'emerald-ape-042')
      await reachReview(page)
      await confirmButton(page).click()
      await expect(page.getByTestId('order-pending')).toBeVisible()
      await mocks.settleOrders()
      await expect(page.getByTestId('order-rejected')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
      await expect(page.getByTestId('order-receipt')).toHaveCount(0)
      await expect(page.getByTestId('header-cart')).toHaveAttribute('aria-label', 'Carrinho, 1 item')
      await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
      await expect(page.getByTestId('cart-row')).toContainText('Emerald Ape #042')
    })
  })

  test('clique repetido cria um único pedido', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'emerald-ape-042')
    await reachReview(page)
    await confirmButton(page).dblclick()
    await expect(page).toHaveURL(/\/pedido\/ord_/)
    expect(await mocks.listOrders()).toHaveLength(1)
  })

  test.describe('timeout após criar o pedido', () => {
    test.use({ scenario: 'order-timeout' })
    test('reenvio com a mesma chave recupera o mesmo pedido', async ({ page, mocks }) => {
      await login(page, USERS.ana)
      await addToCartFromDetail(page, 'emerald-ape-042')
      await reachReview(page)
      const started = Date.now()
      await confirmButton(page).click()
      await expect(page).toHaveURL(/\/pedido\/ord_/, { timeout: 20_000 })
      // The first request timed out on the client (6 s) before the retry recovered the order.
      expect(Date.now() - started).toBeGreaterThan(6000)
      const orders = await mocks.listOrders()
      expect(orders).toHaveLength(1)
      expect(page.url()).toContain(orders[0].id)
    })
  })

  test.describe('carteira recusa a conexão', () => {
    test.use({ scenario: 'wallet-rejected' })
    test('recusa, nova tentativa e desconexão', async ({ page, mocks }) => {
      test.skip(isMobile(page), 'no mobile conexão/desconexão ficam no menu da carteira; a recusa é coberta pela compra')
      await login(page, USERS.ana)
      await addToCartFromDetail(page, 'emerald-ape-042')
      await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
      await page.getByRole('button', { name: 'Conectar carteira' }).click()
      await expect(page.getByRole('region', { name: 'Carteira e rede' }).getByRole('alert')).toContainText('A conexão foi recusada na carteira')

      // "Confirmar compra" asks the wallet again; a new refusal keeps the user on the form.
      const refused = page.waitForResponse((response) => response.url().includes('/connect'))
      await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
      expect((await refused).status()).toBe(403)
      await expect(page.getByRole('region', { name: 'Carteira e rede' }).getByRole('alert')).toContainText('A conexão foi recusada na carteira')
      await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toHaveCount(0)

      await mocks.setScenario('instant')
      await page.getByRole('button', { name: 'Conectar carteira' }).click()
      await expect(page.getByText(/conectada em/)).toBeVisible()
      await page.getByRole('button', { name: 'Desconectar' }).click()
      await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    })
  })
})
