# Kurio — Marketplace de NFTs

Implementação do desafio Frontend da Jungle Gaming: descoberta, compra e conta do colecionador, desktop e mobile, com React + TypeScript, TanStack Router/Query, Axios, Socket.IO, Tailwind CSS, shadcn/ui, MSW, Playwright e Lighthouse.

- **Aplicação publicada:** _adicione aqui a URL da Vercel após o deploy_
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Resultados Lighthouse:** [lighthouse/reports/resultado.md](./lighthouse/reports/resultado.md)

## Requisitos

- Node.js 20.19+ ou 22.12+ (testado com 24)
- pnpm 10+
- Chrome/Edge/Firefox (Service Workers precisam estar liberados para o MSW)

## Setup

```sh
pnpm install
pnpm exec playwright install chromium   # apenas para os testes E2E
pnpm dev:mocks                           # http://localhost:5173 com a API simulada
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `false` (`true` em `.env.mocks`) | Liga a camada MSW (REST + Socket.IO). Usada por `dev:mocks`, `build:demo` e pelos testes. |
| `VITE_API_URL` | `/api` | Base das chamadas REST (Axios). |

`pnpm dev`/`pnpm build` usam `.env.example` como referência (mocks desligados, espera uma API real). `pnpm dev:mocks`/`pnpm build:demo` usam `.env.mocks`.

## Credenciais fictícias

| E-mail | Senha | Situação |
|---|---|---|
| `ana@kurio.test` | `Kurio2026` | carteira principal (MetaMask) e secundária (Coinbase), 2 favoritos |
| `bruno@kurio.test` | `Kurio2026` | sem carteiras (bom para testar o cadastro de carteiras) |

Cupons: `KURIO10` (10%), `GENESIS25` (25%), `VERAO2025` (expirado). Códigos de indicação válidos começam com `KURIO` (ex.: `KURIO2026`).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev:mocks` | Desenvolvimento com mocks |
| `pnpm dev` | Desenvolvimento contra uma API real |
| `pnpm build` | Verificação de tipos + build de produção |
| `pnpm build:demo` | Build de demonstração com mocks (é o que a Vercel publica) |
| `pnpm preview:demo` | Serve o build em `http://127.0.0.1:4173` |
| `pnpm typecheck` | TypeScript (app, configs e testes) |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright (Chromium desktop 1440 px e mobile 390 px) |
| `pnpm test:e2e:ui` | Playwright em modo UI |
| `pnpm test:e2e:update` | Regenera os baselines visuais |
| `pnpm test:e2e:report` | Abre o relatório HTML (`playwright-report/`) |
| `pnpm lighthouse` | Auditoria Lighthouse (precisa do `preview:demo` rodando) |

## Cenários de mock

Selecione um cenário de três formas:

1. **Painel "Mocks"** (botão no canto inferior esquerdo, presente em todo build com mocks): escolha o cenário, dispare eventos em tempo real, expire a sessão e use **"Resetar dados e recarregar"** para voltar às fixtures.
2. **URL**: `?mock-scenario=<id>` (fica salvo para a aba), ex.: `http://localhost:5173/?mock-scenario=slow`.
3. **Console/testes**: `window.__kurioMocks.setScenario('<id>')`, `window.__kurioMocks.reset()`.

| id | Comportamento |
|---|---|
| `default` | sucesso, latência 120–350 ms com semente fixa |
| `instant` | sucesso sem latência (baselines visuais) |
| `empty` | catálogo vazio |
| `slow` | toda resposta leva 2,5 s (skeletons) |
| `variable-latency` | 100 ms – 2 s por resposta, sequência determinística |
| `out-of-order` | na listagem, requisições ímpares lentas e pares rápidas |
| `offline` | toda chamada REST falha com erro de rede |
| `server-error` | catálogo e detalhe respondem 500 |
| `flaky` | o primeiro GET de cada URL responde 503 (o retry recupera) |
| `session-expired` | sessões novas expiram em 20 s |
| `favorite-failure` | favoritar responde 500 (rollback otimista) |
| `checkout-price-change` | no 1º envio do pedido o preço do 1º item sobe 0,05 ETH |
| `checkout-sold-out` | no 1º envio do pedido a edição do 1º item esgota |
| `order-timeout` | o 1º envio grava o pedido mas responde depois do timeout do cliente |
| `payment-rejected` | pedidos pendentes são recusados |
| `wallet-rejected` | a conexão da carteira é recusada |

**Reset:** o painel ("Resetar dados e recarregar") ou `window.__kurioMocks.reset('default')` + recarregar restauram fixtures, sessão, carrinho e checkout.

## Reproduzindo os fluxos de falha

| Fluxo | Como reproduzir |
|---|---|
| Skeletons / carregamento lento | `?mock-scenario=slow` e navegue por início, detalhe e carrinho |
| Erro 500 e nova tentativa | `?mock-scenario=server-error`; no painel volte para "Padrão" e clique em "Tentar novamente" |
| Sem conexão | `?mock-scenario=offline` |
| Respostas fora de ordem | `?mock-scenario=out-of-order` e clique rápido em filtros diferentes |
| Cadastro com conflito | crie conta com `ana@kurio.test` ou usuário `ana_coleciona` |
| Sessão expirada | entre, abra `/perfil`, painel → "Expirar sessão atual", clique em "Salvar" |
| Favorito com falha | entre, painel → "Falha ao favoritar", clique em "Favoritar" no detalhe |
| Cupom inválido/expirado | no carrinho use `XYZ` ou `VERAO2025` |
| Preço muda no carrinho/checkout | com um item no carrinho (ou na revisão do pagamento), painel → "Aumentar preço do 1º item do carrinho" |
| Edição esgota | painel → "Esgotar edição do 1º item do carrinho", ou cenário `checkout-sold-out` |
| Preço muda na confirmação | cenário `checkout-price-change`, faça a compra até "Confirmar compra · total" |
| Timeout com recuperação | cenário `order-timeout`; confirme a compra (o reenvio usa a mesma chave) |
| Pagamento recusado | cenário `payment-rejected` |
| Carteira recusa conexão | cenário `wallet-rejected`, clique em "Conectar carteira" |
| Queda do tempo real | painel → "Derrubar conexão por 5 s" (com um pedido pendente, recarregue a página) |
| Evento duplicado / antigo | painel → "Reenviar último evento" / "Enviar evento antigo" |

## Testes E2E

```sh
pnpm test:e2e
```

O Playwright sobe `pnpm dev:mocks` na porta 4173. Cada teste roda em contexto isolado (o "servidor" MSW nasce das fixtures), com cenário, relógio (`page.clock`), latência e eventos controlados. Relatório HTML em `playwright-report/`; traces e screenshots só das falhas em `test-results/`.

| Spec | Cobertura |
|---|---|
| `01-catalog` | busca, filtros combinados, reset de paginação, ordenação, histórico, vazio, fora de ordem |
| `02-detail` | acesso direto, galeria, edição esgotada, limite de quantidade, NFT inexistente, 404 |
| `03-auth` | cadastro (validação e conflito), login, retorno ao fluxo, expiração (controle e relógio), logout, troca de usuário |
| `04-favorites` | visitante, persistência, falha + rollback + nova tentativa |
| `05-cart` | quantidades, limites, cupom inválido/expirado/válido, remoção, persistência e merge no login |
| `06-purchase` | do catálogo ao recibo; recibo como snapshot; remoção só do que foi comprado |
| `07-payment-failures` | pagamento recusado, clique repetido, timeout + mesma chave, carteira recusada/desconexão |
| `08-account` | perfil (validação e conflito), avatar, senha, carteiras principal/secundária com erros da API |
| `09-realtime-checkout` | preço/estoque via Socket.IO no carrinho e na revisão; `QUOTE_STALE` e esgotamento no servidor |
| `10-realtime-resilience` | duplicados, antigos, reconexão com reconciliação REST, pedido pendente após queda/refresh, isolamento por usuário |
| `11-accessibility` | skip link, foco em diálogos, erros associados, operação por teclado |
| `12-loading-errors` | skeletons, 500, offline, 503 transitório, vazio |
| `13-responsive` | sem overflow horizontal em 390, 768 e 1440 px em todas as telas |
| `visual/visual.spec.ts` | regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile) |

## Lighthouse

```sh
pnpm build:demo
pnpm preview:demo        # em um terminal
pnpm lighthouse          # em outro
```

Mede início e detalhe, mobile e desktop, 3 vezes cada, com o build de demonstração e o cenário padrão dos mocks. Gera HTML/JSON por execução e `lighthouse/reports/resultado.md` com medianas, LCP/CLS/TBT, versões, ambiente e justificativas. Configuração versionada em `lighthouse/config.mjs` (mobile) e `lighthouse/config.desktop.mjs`. Use `LIGHTHOUSE_URL` para medir o deploy.

## Deploy (Vercel)

O `vercel.json` já define `pnpm build:demo`, a saída `dist`, cache dos assets e o rewrite de SPA (acesso direto e refresh de qualquer rota). Basta importar o repositório na Vercel; nenhuma variável extra é necessária.

## Estrutura

Veja a seção 1 do [ARCHITECTURE.md](./ARCHITECTURE.md).
