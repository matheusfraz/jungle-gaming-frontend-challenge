import { expect, test } from '@playwright/test'

test('opens the application home route', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Jungle Gaming')
  await expect(
    page.getByRole('heading', { name: 'Jungle Gaming', level: 1 }),
  ).toBeVisible()
})
