import { expect, login, openApp, test, USERS } from '../support/fixtures'

test.describe('4. Favoritos', () => {
  test('visitante é enviado ao login ao favoritar', async ({ page }) => {
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fnft%2Femerald-ape-042/)
  })

  test('favorito persiste após refresh', async ({ page }) => {
    await login(page, USERS.ana)
    await openApp(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible()
    await openApp(page, '/perfil/favoritos')
    await expect(page.getByTestId('favorites-grid').getByText('Emerald Ape #042')).toBeVisible()
  })

  test('falha na mutation desfaz a atualização otimista e permite nova tentativa', async ({ page, mocks }) => {
    await login(page, USERS.ana)
    await openApp(page, '/nft/emerald-ape-042')
    await mocks.setScenario('favorite-failure')

    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByText(/Não foi possível favoritar Emerald Ape #042/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute('aria-pressed', 'false')

    await mocks.setScenario('instant')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible()
  })
})
