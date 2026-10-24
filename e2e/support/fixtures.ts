import { expect, test as base, type Page } from '@playwright/test'

/**
 * Every test gets a fresh browser context, so the MSW database (persisted in
 * that context's localStorage) starts from the fixtures. The scenario is set
 * before the app boots, then can be changed through `window.__kurioMocks`,
 * which only drives the mock *server* — the UI is observed, never poked.
 */

type ScenarioId =
  | 'default'
  | 'instant'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'flaky'
  | 'session-expired'
  | 'favorite-failure'
  | 'checkout-price-change'
  | 'checkout-sold-out'
  | 'order-timeout'
  | 'payment-rejected'
  | 'wallet-rejected'

export const USERS = {
  ana: { email: 'ana@kurio.test', password: 'Kurio2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.test', password: 'Kurio2026', name: 'Bruno Lima' },
} as const

export class Mocks {
  constructor(private readonly page: Page) {}

  private call<T>(method: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(
      ([name, params]) => {
        const control = window.__kurioMocks as unknown as Record<string, (...values: unknown[]) => unknown>
        return control[name as string](...(params as unknown[])) as T
      },
      [method, args] as const,
    )
  }

  setScenario(id: ScenarioId) {
    return this.call<void>('setScenario', id)
  }
  updateNft(nftId: string, patch: { priceEth?: string; editions?: { id: string; available: number }[] }) {
    return this.call<{ version: number }>('updateNft', nftId, patch)
  }
  replayLastEvent() {
    return this.call<unknown>('replayLastEvent')
  }
  emitStaleNftEvent(nftId: string, priceEth: string) {
    return this.call<unknown>('emitStaleNftEvent', nftId, priceEth)
  }
  dropSockets(ms: number) {
    return this.call<void>('dropSockets', ms)
  }
  expireSessions() {
    return this.call<void>('expireSessions')
  }
  settleOrders() {
    return this.call<void>('settleOrders')
  }
  listOrders() {
    return this.call<{ id: string; status: string; userId: string }[]>('listOrders')
  }
  inbox(email: string) {
    return this.call<{ to: string; subject: string; code: string }[]>('inbox', email)
  }
  async latestCode(email: string) {
    const messages = await this.inbox(email)
    const code = messages.at(-1)?.code
    if (!code) throw new Error(`No e-mail sent to ${email}`)
    return code
  }
  connectedClients() {
    return this.call<{ userId: string | null }[]>('connectedClients')
  }
}

export const test = base.extend<{ scenario: ScenarioId; mocks: Mocks }>({
  scenario: ['instant', { option: true }],
  page: async ({ page, scenario }, use) => {
    await page.addInitScript((id) => {
      if (!window.sessionStorage.getItem('kurio:mock-scenario')) window.sessionStorage.setItem('kurio:mock-scenario', id)
    }, scenario)
    await use(page)
  },
  mocks: async ({ page }, use) => {
    await use(new Mocks(page))
  },
})

export { expect }

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** Waits until the app (and the mock worker) finished booting. */
export async function openApp(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForFunction(() => Boolean(window.__kurioMocks))
  await expect(page.locator('#conteudo')).toBeVisible()
}

/** Login form: a dialog over the home on desktop, a full page on mobile. */
export function loginForm(page: Page) {
  return page.getByRole('form', { name: 'Entrar' })
}

export function registerForm(page: Page) {
  return page.getByRole('form', { name: 'Criar conta' })
}

export async function login(page: Page, user: { email: string; password: string }, path = '/entrar') {
  await openApp(page, path)
  const form = loginForm(page)
  await form.getByPlaceholder('contato@email.com').fill(user.email)
  await form.getByPlaceholder('Senha').fill(user.password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(loginForm(page)).toHaveCount(0)
  await page.waitForFunction(() => Boolean(window.localStorage.getItem('kurio:token')))
}

export async function logout(page: Page) {
  if (isMobile(page)) {
    // Mobile: no header menu; "Sair" lives in the profile navigation.
    await openApp(page, '/perfil')
    await page.getByRole('button', { name: 'Sair' }).click()
  } else {
    await page.getByTestId('user-menu').click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
  }
  await page.waitForFunction(() => !window.localStorage.getItem('kurio:token'))
}

/** Opens the filter drawer on mobile; on desktop the sidebar is always visible. */
export async function filters(page: Page) {
  if (isMobile(page)) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
    return page.getByRole('dialog')
  }
  return page.getByTestId('catalog-filters')
}

export async function closeFilters(page: Page) {
  if (isMobile(page)) await page.keyboard.press('Escape')
}

export function cards(page: Page) {
  return page.getByTestId('nft-grid').getByTestId('nft-card')
}

export async function addToCartFromDetail(page: Page, nftId: string, quantity = 1) {
  await openApp(page, `/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  for (let index = 1; index < quantity; index += 1) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  await buyButton(page).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByTestId('cart-row').first()).toBeVisible()
}

/** "COMPRAR" on desktop, "Comprar NFT" in the mobile purchase bar. */
export function buyButton(page: Page) {
  return page.getByRole('button', { name: /^comprar( nft)?$/i })
}

/** From the cart, go to checkout, connect the wallet and reach the review step. */
export async function reachReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.locator('main').getByLabel('Endereço da carteira')).toHaveValue(/^0x/)
  if (!isMobile(page)) {
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText(/conectada em/)).toBeVisible()
  }
  // On mobile "Confirmar compra" asks the wallet to connect by itself.
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
}

export function confirmButton(page: Page) {
  return page.getByRole('button', { name: /^Confirmar compra ·/ })
}
