/** Mobile screens with their own top bar and bottom action area (no tab bar, no footer). */
const TASK_PREFIXES = ['/nft/', '/carrinho', '/pagamento', '/entrar', '/cadastro']
/** Mobile screens whose top is the catalog search bar instead of the brand bar. */
const SEARCH_TOP = ['/', '/mercado']

export function mobileChromeFor(pathname: string) {
  const task = TASK_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  return {
    tabBar: !task,
    footer: !task,
    brandBar: !task && !SEARCH_TOP.includes(pathname),
  }
}
