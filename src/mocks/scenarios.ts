/**
 * Deterministic mock scenarios. A scenario is selected with `?mock-scenario=<id>`
 * (persisted for the tab), from the "Mocks" panel, or with
 * `window.__kurioMocks.setScenario(id)` in tests.
 */
export const scenarioIds = [
  'default',
  'instant',
  'empty',
  'slow',
  'variable-latency',
  'out-of-order',
  'offline',
  'server-error',
  'flaky',
  'session-expired',
  'favorite-failure',
  'checkout-price-change',
  'checkout-sold-out',
  'order-timeout',
  'payment-rejected',
  'wallet-rejected',
] as const

export type ScenarioId = (typeof scenarioIds)[number]

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  description: string
}

export const scenarios: Record<ScenarioId, ScenarioDefinition> = {
  default: { id: 'default', label: 'Padrão', description: 'Sucesso com latência curta (120–350 ms, semente fixa).' },
  instant: { id: 'instant', label: 'Instantâneo', description: 'Sucesso sem latência. Usado nas baselines visuais.' },
  empty: { id: 'empty', label: 'Catálogo vazio', description: 'A listagem de NFTs retorna zero resultados.' },
  slow: { id: 'slow', label: 'Rede lenta', description: 'Toda resposta leva 2,5 s (skeletons visíveis).' },
  'variable-latency': {
    id: 'variable-latency',
    label: 'Latência variável',
    description: 'Cada resposta leva entre 100 ms e 2 s (sequência determinística).',
  },
  'out-of-order': {
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description: 'Na listagem, requisições ímpares levam 1,6 s e pares 150 ms: a resposta antiga chega depois.',
  },
  offline: { id: 'offline', label: 'Sem conexão', description: 'Toda requisição REST falha com erro de rede.' },
  'server-error': {
    id: 'server-error',
    label: 'Erro 500 no catálogo',
    description: 'Listagem e detalhe respondem HTTP 500 até o cenário ser trocado.',
  },
  flaky: {
    id: 'flaky',
    label: 'Falha transitória',
    description: 'A primeira chamada de cada GET responde 503; a nova tentativa funciona.',
  },
  'session-expired': {
    id: 'session-expired',
    label: 'Sessão curta',
    description: 'Sessões criadas neste cenário expiram 20 s após o login.',
  },
  'favorite-failure': {
    id: 'favorite-failure',
    label: 'Falha ao favoritar',
    description: 'Incluir/remover favorito responde HTTP 500 (testa o rollback otimista).',
  },
  'checkout-price-change': {
    id: 'checkout-price-change',
    label: 'Preço muda na compra',
    description: 'Na primeira tentativa de pedido o preço do primeiro item sobe 0,05 ETH.',
  },
  'checkout-sold-out': {
    id: 'checkout-sold-out',
    label: 'Edição esgota na compra',
    description: 'Na primeira tentativa de pedido a edição do primeiro item esgota.',
  },
  'order-timeout': {
    id: 'order-timeout',
    label: 'Timeout após criar pedido',
    description: 'A primeira criação de pedido grava o pedido mas não responde a tempo; o reenvio com a mesma chave recupera o mesmo pedido.',
  },
  'payment-rejected': {
    id: 'payment-rejected',
    label: 'Pagamento recusado',
    description: 'Pedidos ficam pendentes e depois são recusados pela rede simulada.',
  },
  'wallet-rejected': {
    id: 'wallet-rejected',
    label: 'Carteira recusa conexão',
    description: 'A simulação de conexão da carteira é recusada pelo usuário.',
  },
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (scenarioIds as readonly string[]).includes(value)
}

/** mulberry32: tiny seeded PRNG so "random" latency is reproducible. */
export function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
