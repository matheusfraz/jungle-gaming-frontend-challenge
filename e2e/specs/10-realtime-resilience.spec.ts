import { addToCartFromDetail, confirmButton, expect, login, openApp, reachReview, test, USERS } from '../support/fixtures'

test.describe('10. Eventos duplicados/antigos, desconexão e pedido pendente', () => {
  test('evento duplicado é aplicado uma vez e evento antigo é ignorado', async ({ page, mocks }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect(page.getByTestId('nft-price')).toContainText('1.19 ETH')
    await expect.poll(() => mocks.connectedClients().then((clients) => clients.length)).toBeGreaterThan(0)

    await mocks.updateNft('emerald-ape-042', { priceEth: '1.30' })
    await expect(page.getByTestId('nft-price')).toContainText('1.30 ETH')
    const toasts = page.getByText('Preço atualizado: 1.30 ETH')
    await expect(toasts).toHaveCount(1)

    // Same event id delivered again: no duplicate effect.
    await mocks.replayLastEvent()
    await page.waitForTimeout(500)
    await expect(toasts).toHaveCount(1)

    // Older version with a bogus price: must not regress the state.
    await mocks.emitStaleNftEvent('emerald-ape-042', '0.01')
    await page.waitForTimeout(500)
    await expect(page.getByTestId('nft-price')).toContainText('1.30 ETH')
    await expect(page.getByTestId('nft-price')).not.toContainText('0.01')
  })

  test('alteração durante a desconexão é reconciliada via REST ao reconectar', async ({ page, mocks }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await expect.poll(() => mocks.connectedClients().then((clients) => clients.length)).toBeGreaterThan(0)
    await mocks.dropSockets(2000)
    await mocks.updateNft('emerald-ape-042', { priceEth: '1.77' })
    // The event was lost (no socket); after reconnecting the page refetches.
    await expect(page.getByTestId('nft-price')).toContainText('1.77 ETH', { timeout: 15_000 })
  })

  test('pedido pendente sobrevive a queda de conexão e refresh sem duplicar a compra', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'emerald-ape-042')
    await reachReview(page)
    await confirmButton(page).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    const url = page.url()

    await mocks.dropSockets(3000)
    await page.reload()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await mocks.settleOrders()

    await expect(page.getByTestId('order-receipt')).toBeVisible({ timeout: 15_000 })
    expect(page.url()).toBe(url)
    expect(await mocks.listOrders()).toHaveLength(1)

    // Terminal state: going back to checkout does not resend the order.
    await openApp(page, '/pagamento')
    await expect(page.getByRole('heading', { name: 'Não há itens para pagar' })).toBeVisible()
    expect(await mocks.listOrders()).toHaveLength(1)
  })

  test('refresh durante o envio recupera a mesma tentativa', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await mocks.setScenario('order-timeout')
    await addToCartFromDetail(page, 'emerald-ape-042')
    await reachReview(page)
    await confirmButton(page).click()
    // Reload while the request is still hanging.
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page).toHaveURL(/\/pedido\/ord_/, { timeout: 20_000 })
    expect(await mocks.listOrders()).toHaveLength(1)
  })

  test('eventos de pedido de outro usuário não chegam à sessão atual', async ({ page, mocks }) => {
    await login(page, USERS.bruno)
    await openApp(page, '/')
    await expect.poll(() => mocks.connectedClients()).toEqual([{ userId: 'usr_bruno' }])
  })
})
