import { cards, closeFilters, expect, filters, isMobile, openApp, test } from '../support/fixtures'

test.describe('1. Catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('busca pelo cabeçalho compõe a URL e sobrevive ao refresh', async ({ page }) => {
    await openApp(page, '/')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByLabel('Termo de busca').fill('Golden')
    await page.getByLabel('Termo de busca').press('Enter')

    await expect(page).toHaveURL(/\/mercado\?q=Golden/)
    await expect(cards(page)).toHaveCount(4)
    for (const name of await cards(page).getByRole('heading').allInnerTexts()) expect(name).toContain('Golden')

    await page.reload()
    await expect(cards(page)).toHaveCount(4)
    await expect(page.getByRole('button', { name: /“Golden”/ })).toBeVisible()
  })

  test('filtros combinados reiniciam a paginação e o histórico restaura o estado', async ({ page }) => {
    await openApp(page, '/mercado')
    await expect(cards(page)).toHaveCount(9)

    // Go to page 2 first.
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    // Category filter resets pagination.
    let panel = await filters(page)
    const music = panel.getByRole('button', { name: /Música/ })
    const musicCount = Number((await music.innerText()).match(/\((\d+)\)/)?.[1])
    await music.click()
    await closeFilters(page)
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page).toHaveURL(/categories=/)
    await expect(page.getByText(`${musicCount} resultado(s)`)).toBeVisible()

    // Network filter combines with the category.
    panel = await filters(page)
    await panel.getByRole('button', { name: /Polygon/ }).click()
    await closeFilters(page)
    await expect(page).toHaveURL(/networks=/)
    await expect(cards(page).filter({ hasText: 'Golden Frequency #071' })).toBeVisible()
    const combined = await cards(page).count()
    expect(combined).toBeLessThanOrEqual(musicCount)

    // Back: only the category filter; forward: both again.
    await page.goBack()
    await expect(page).not.toHaveURL(/networks=/)
    await expect(page.getByText(`${musicCount} resultado(s)`)).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL(/networks=/)
    await expect(cards(page)).toHaveCount(combined)
  })

  test('ordenação por menor preço e refresh mantêm o resultado', async ({ page }) => {
    await openApp(page, '/mercado')
    await page.getByLabel('Ordenar por').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(cards(page).first()).toContainText('Copper Wave')
    await expect(cards(page).first()).toContainText('0.02 ETH')
    await page.reload()
    await expect(cards(page).first()).toContainText('Copper Wave')
  })

  test('aba "Em alta" e resultado vazio com limpeza de filtros', async ({ page }) => {
    await openApp(page, '/mercado?q=%22naoexiste%22')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(cards(page)).toHaveCount(9)

    await page.getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
  })

  test.describe('respostas fora de ordem', () => {
    test.use({ scenario: 'out-of-order' })
    test('a resposta antiga e lenta não sobrescreve o filtro atual', async ({ page }) => {
      test.skip(isMobile(page), 'cenário de rede, coberto no desktop')
      await openApp(page, '/mercado')
      await expect(cards(page)).toHaveCount(9)
      const panel = await filters(page)
      // 1st click → slow response; 2nd click right after → fast response.
      await panel.getByRole('button', { name: /Fotografia/ }).click()
      await panel.getByRole('button', { name: /Fotografia/ }).click()
      await panel.getByRole('button', { name: /Solana/ }).click()
      await expect(page).toHaveURL(/networks=%5B%22solana%22%5D/)
      await page.waitForTimeout(2000)
      await expect(page.getByText('7 resultado(s)')).toBeVisible()
    })
  })
})
