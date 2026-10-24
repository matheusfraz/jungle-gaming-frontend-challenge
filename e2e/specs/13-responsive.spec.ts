import type { Page } from '@playwright/test'
import { addToCartFromDetail, expect, isMobile, login, openApp, test, USERS } from '../support/fixtures'

/** Elements that stick out of the viewport (ignoring intentional horizontal scrollers). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const scrollsX = (element: Element | null): boolean => {
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (['auto', 'scroll', 'hidden'].includes(style.overflowX) && node.scrollWidth > node.clientWidth) return true
      }
      return false
    }
    return [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return false
        if (getComputedStyle(element).position === 'fixed') return false
        return rect.right > width + 1 && !scrollsX(element.parentElement)
      })
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`)
  })
}

const widths = [390, 768, 1440]

test.describe('Responsividade: sem overflow horizontal em 390, 768 e 1440 px', () => {
  test.beforeEach(({ page }) => {
    test.skip(isMobile(page), 'a spec troca as larguras por conta própria')
  })

  test('telas públicas', async ({ page }) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/mercado', '/nft/emerald-ape-042', '/entrar', '/rota-inexistente']) {
        await openApp(page, path)
        await page.waitForLoadState('networkidle')
        expect(await overflowing(page), `${path} @ ${width}px`).toEqual([])
      }
    }
  })

  test('carrinho, pagamento, perfil, carteiras e pedido', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await addToCartFromDetail(page, 'emerald-ape-042', 2)
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/carrinho', '/pagamento', '/perfil', '/perfil/carteiras', '/perfil/favoritos']) {
        await openApp(page, path)
        await page.waitForLoadState('networkidle')
        expect(await overflowing(page), `${path} @ ${width}px`).toEqual([])
      }
    }
    // Order confirmation (receipt dialog) at phone width.
    await page.setViewportSize({ width: 390, height: 900 })
    await openApp(page, '/pagamento')
    // Mobile layout: the main button connects the wallet and opens the review.
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    await page.getByRole('button', { name: /^Confirmar compra ·/ }).click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    expect(await overflowing(page)).toEqual([])
    await mocks.settleOrders()
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    expect(await overflowing(page)).toEqual([])
    // Simulated explorer at phone width (long hashes must wrap).
    await page.getByRole('link', { name: 'Ver no Etherscan' }).click()
    await expect(page.getByTestId('explorer-transaction')).toBeVisible()
    expect(await overflowing(page)).toEqual([])
  })
})
