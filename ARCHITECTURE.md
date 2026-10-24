# Arquitetura — Kurio NFT Marketplace

Este documento descreve as decisões técnicas, os contratos REST e de eventos, a política de sessão, o estado do carrinho, a estratégia de cache, a reconciliação REST × Socket.IO, as limitações conhecidas e os desvios em relação ao Figma.

## 1. Visão geral

```
src/
  main.tsx               entry mínimo: espera o 1º paint do shell, baixa app + mocks em paralelo
  app.tsx                QueryClientProvider + RouterProvider
  router.tsx             TanStack Router (contexto: queryClient)
  routes/                rotas por arquivo (finas; delegam para features)
    _authenticated/      rotas privadas (guarda em beforeLoad + no layout)
  contracts/             schemas zod = tipos únicos de transporte, estado e UI
  lib/                   http (Axios), query (QueryClient e chaves), money (decimal.js), sessão, storage
  realtime/              cliente Socket.IO (dedupe/versão/sessão) e sincronização com o cache
  features/<domínio>/    api + hooks + componentes por domínio
    auth · catalog · nft-detail · favorites · cart · checkout · orders · account (perfil e carteiras)
  components/            ui (shadcn/ui adaptado), layout, common, feedback (aria-live)
  mocks/                 único lugar que importa MSW: db, cenários, handlers REST, servidor Socket.IO, painel
```

Fluxo de dados: **componente → hook (TanStack Query) → api da feature → `request()` (Axios + validação zod) → MSW**. Componentes, hooks e o cliente Axios não contêm respostas fictícias: tudo que é simulado vive em `src/mocks`, ativado por `VITE_ENABLE_MOCKS`.

## 2. Contratos

Os contratos ficam em `src/contracts/*.ts` como schemas **zod**; os tipos TypeScript são inferidos deles. Toda resposta passa por `request(schema, config)` (`src/lib/http/client.ts`), que valida o payload — dados fora do contrato viram `INVALID_RESPONSE` em vez de chegarem à UI. Os handlers MSW usam os **mesmos** schemas para validar entradas (as regras de formulário do cliente e do "servidor" são idênticas).

Valores em ETH trafegam como **strings decimais** (`moneySchema`) e todo cálculo usa `decimal.js` (`src/lib/money.ts`). Quantidades são inteiras. Subtotal, desconto, taxa e total exibidos vêm sempre da cotação da API.

### 2.1 Erros

Formato único (`apiErrorSchema`): `{ code, message, fieldErrors?, details? }`.

| HTTP | `code` | Uso |
|---|---|---|
| 400 / 422 | `VALIDATION_ERROR` | corpo inválido; `fieldErrors` por campo |
| 401 | `UNAUTHORIZED` · `SESSION_EXPIRED` | sem sessão / token inválido / expirado |
| 403 | `FORBIDDEN` · `WALLET_REJECTED` | recurso de outro usuário · carteira recusou a conexão |
| 404 | `NOT_FOUND` | recurso inexistente |
| 409 | `CONFLICT` | cadastro/perfil com e-mail ou usuário em uso |
| 409 | `AVAILABILITY_CONFLICT` | quantidade acima do disponível; edição esgotada (`details.quote`) |
| 409 | `QUOTE_STALE` | cotação desatualizada (`details.quote` nova + `details.changes`) |
| 409 | `IDEMPOTENCY_CONFLICT` | mesma `Idempotency-Key` com corpo diferente |
| 409 | `WALLET_NOT_CONNECTED` | pedido sem carteira conectada |
| 422 | `COUPON_INVALID` · `COUPON_EXPIRED` | cupom |
| 5xx | `TRANSIENT` · `INTERNAL` | falha transitória |

No cliente, falhas de rede viram `NETWORK_ERROR`, timeouts `TIMEOUT` e cancelamentos `CANCELED` (`ApiRequestError.isTransient` decide o que pode ser repetido).

### 2.2 Endpoints REST (prefixo `VITE_API_URL`, padrão `/api`)

| Recurso | Método e rota | Corpo / parâmetros | Resposta |
|---|---|---|---|
| Sessão | `POST /auth/register` | `{ username, email, password, confirmPassword }` | `201 { token, session }` |
| | `POST /auth/login` | `{ email, password }` | `{ token, session }` |
| | `GET /auth/session` | Bearer | `{ user, expiresAt }` |
| | `POST /auth/logout` | Bearer | `204` |
| NFTs | `GET /nfts` | `q, category[], network[], minPrice, maxPrice, sort, tab, page, pageSize, collection, exclude, featured` | `{ items, pagination, facets }` |
| | `GET /nfts/:id` | — | `NftDetail` (galeria, edições com disponibilidade, avaliações…) |
| Favoritos | `GET /favorites` · `PUT/DELETE /favorites/:nftId` | Bearer | `{ nftIds }` |
| Carrinho | `GET /cart` | Bearer **ou** `X-Guest-Cart` | `Cart` |
| | `POST /cart/items` | `{ nftId, editionId, quantity }` | `201 Cart` |
| | `PATCH /cart/items/:lineId` · `DELETE /cart/items/:lineId` | `{ quantity }` | `Cart` |
| | `POST /cart/coupon` · `DELETE /cart/coupon` | `{ code }` | `Cart` |
| | `POST /cart/merge` | `{ guestCartId }` (Bearer) | `Cart` do usuário |
| Cotação | `POST /quotes` | `{ items, couponCode, network }` | `Quote` (`id`, `hash`, linhas, subtotal, desconto, taxa, total, `issues`, `expiresAt`) |
| Pedidos | `POST /orders` | header `Idempotency-Key` + `{ quoteId, quoteHash, walletId, network, collector, note }` | `201` novo · `200` mesmo pedido |
| | `GET /orders/:id` | Bearer (dono) | `Order` (snapshot do recibo) |
| Perfil | `GET/PATCH /profile` · `POST/DELETE /profile/avatar` · `POST /profile/password` | Bearer | `Profile` / `204` |
| Carteiras | `GET /wallets` · `PUT /wallets/:slot` (`primary`/`secondary`) · `POST /wallets/secondary/same-as-primary` | Bearer | `{ primary, secondary, secondarySameAsPrimary, connections }` |
| | `POST /wallets/:id/connect` · `POST /wallets/:id/disconnect` | `{ network }` | `{ walletId, status, network, address }` |
| Newsletter | `POST /newsletter` | `{ email }` | `201` |

**Idempotência de pedidos:** a chave é escopada por usuário. Mesma chave + mesmo corpo (hash) ⇒ devolve o mesmo pedido (200). Mesma chave + corpo diferente ⇒ `409 IDEMPOTENCY_CONFLICT`. Antes de criar, o servidor **recalcula a cotação**: se o hash mudou (preço, taxa, cupom) responde `QUOTE_STALE`; se faltou estoque, `AVAILABILITY_CONFLICT`. Ao criar, reserva as unidades; o pedido fica `pending` e depois vira `confirmed` (remove do carrinho **apenas** as quantidades compradas) ou `rejected` (devolve a reserva; carrinho intacto). `confirmed` e `rejected` são terminais.

### 2.3 Eventos Socket.IO

Todos carregam **identidade estável** (`id`), **recurso** (`resource: { type, id }`) e **versão** monotônica do recurso.

```ts
// nft.updated — preço/disponibilidade
{ id: 'evt_000123', type: 'nft.updated', occurredAt, version: 7,
  resource: { type: 'nft', id: 'emerald-ape-042' },
  data: { priceEth: '1.24', compareAtEth: null, soldOut: false, editions: [{ id: '1-50', available: 22 }, …] } }

// order.updated — estado do pedido (entregue só ao dono)
{ id: 'evt_000124', type: 'order.updated', occurredAt, version: 2, userId: 'usr_ana',
  resource: { type: 'order', id: 'ord_…' },
  data: { status: 'confirmed', txHash: '0x…', explorerUrl: 'https://sepolia.etherscan.io/tx/0x…', rejectionReason: null } }
```

Eventos de controle: o cliente envia `session:subscribe { token }` / `session:unsubscribe`; o servidor responde `session:subscribed { userId }`.

## 3. Tempo real e reconciliação com REST

`src/realtime/client.ts` mantém **uma** conexão `socket.io-client` (`path: '/realtime'`, transporte WebSocket) e garante:

- **duplicatas**: ids já vistos (buffer de 500) são descartados;
- **eventos antigos**: guarda a última versão aplicada por recurso; `version <= atual` é ignorada. Respostas REST também registram a versão (`noteVersion`), então um evento atrasado nunca regride um dado mais novo vindo do REST;
- **isolamento por sessão**: `order.updated` só é aceito se `userId` = usuário da sessão atual; ao trocar de usuário as versões de pedidos são esquecidas e a assinatura é refeita;
- **reconexão**: após reconectar, `onReconnect` invalida catálogo, detalhe, carrinho, cotação e pedidos ativos — o REST volta a ser a fonte da verdade (`use-realtime-sync.ts`);
- **ciclo de vida**: listeners são removidos no unmount; sem socket, a página de pedido pendente faz polling a cada 3 s.

Aplicação no cache (`use-realtime-sync.ts`): `nft.updated` atualiza detalhe e listas por `setQueryData` (só se a versão for maior), e para carrinhos que contêm o NFT gera um aviso ("O preço de X mudou de A para B", "a edição esgotou"), anuncia via `aria-live` e invalida carrinho e cotação. No checkout, um evento que altere preço ou deixe a quantidade indisponível marca a revisão como **desatualizada** e bloqueia "Confirmar" até o usuário atualizar a revisão; o servidor ainda revalida no envio.

## 4. Sessão e autenticação

- Login/cadastro devolvem um **token bearer** guardado em `localStorage` (`kurio:token`), o único segredo no navegador. Senhas nunca são guardadas em claro: no mock ficam como `SHA-256(salt:senha)` com salt por usuário.
- `GET /auth/session` (query `['session']`) recupera a sessão após refresh; 401 limpa o token.
- **Rotas privadas** (`/pagamento`, `/pedido/:id`, `/perfil/*`): `beforeLoad` em `_authenticated` redireciona para `/entrar?redirect=<href>`. Login retorna ao `redirect` (só caminhos relativos são aceitos).
- **Expiração**: qualquer 401 com token dispara `onSessionInvalid` → a sessão é encerrada, os dados privados saem do cache e, se a tela for privada, o usuário vai para `/entrar?redirect=…&reason=expired`. O rascunho do checkout fica em `sessionStorage` e o carrinho no servidor, então nada se perde na retomada.
- **Logout / troca de usuário**: navega para fora das telas privadas, remove do cache tudo em `['user', …]`, `['cart', …]` e `['quote', …]` e refaz a assinatura do socket. As chaves privadas sempre incluem o usuário (`['user', userId, 'favorites']`, `['cart', 'user:<id>']`), o que impede vazamento entre usuários.

## 5. Estado do carrinho

- O carrinho vive **no servidor**. Visitantes têm um id estável (`X-Guest-Cart`, salvo em `localStorage`), então o carrinho sobrevive a refresh; no login, `POST /cart/merge` incorpora o carrinho do visitante ao do usuário (respeitando limites) e um novo id de visitante é gerado.
- Limites por linha: `min(disponível, máximo por pedido)` da edição; o servidor responde `409 AVAILABILITY_CONFLICT` ao exceder e a UI mostra "Só restam N" com ação de ajuste.
- Cupom é aplicado/removido no carrinho (`KURIO10`, `GENESIS25`; `VERAO2025` expirado). O **resumo** vem de `POST /quotes` com a assinatura do carrinho na chave da query.
- Alteração de quantidade é **otimista** com rollback (assim como favoritos).

## 6. Estratégia de cache, retries e sincronização

| Dado | Chave | staleTime | Observações |
|---|---|---|---|
| Sessão | `['session']` | 5 min | sem retry em 4xx |
| Listagem | `['nfts','list', params]` | 30 s | `placeholderData: keepPreviousData`; params completos na chave; `signal` cancela requisições superadas |
| Detalhe | `['nft', id]` | 30 s | sem retry em 404 |
| Carrinho | `['cart', owner]` | 15 s | owner = `user:<id>` ou `guest:<id>` |
| Cotação | `['quote', owner, assinatura]` | 20 s | assinatura = rede + cupom + itens/preços/versões |
| Privados | `['user', userId, …]` | 30–60 s | favoritos, perfil, carteiras, pedidos |

- **Retries**: queries repetem só falhas transitórias (rede, timeout, 5xx), 2×, com backoff exponencial (500 ms → 4 s). 4xx nunca. **Mutations não repetem automaticamente**, com uma exceção controlada: criação de pedido reenvia até 2× com a **mesma** `Idempotency-Key` em timeout/erro de rede, e depois oferece "Tentar novamente" com a mesma chave.
- **Respostas fora de ordem**: cada combinação de filtros é uma entrada de cache; respostas de chaves antigas não afetam a tela atual e são canceladas via `AbortSignal` (cenário `out-of-order` comprova).
- **Invalidação**: mutations de carrinho gravam a resposta no cache e invalidam cotações; favoritos fazem update otimista + `invalidate` no fim; perfil atualiza também o resumo do usuário na sessão; eventos e reconexão invalidam conforme a seção 3.
- `refetchOnWindowFocus` desligado (o tempo real cobre as mudanças relevantes).

## 7. Pagamento: revisão, idempotência e recuperação

1. Formulário "Perfil do colecionador" (validação zod igual à do servidor), pré-preenchido pela carteira principal e pelo perfil; rascunho persistido em `sessionStorage`.
2. Seleção de carteira cadastrada + **conexão simulada** (aprovar, recusar no cenário `wallet-rejected`, desconectar).
3. "Confirmar compra" gera uma **cotação nova** e abre a **revisão**.
4. "Confirmar compra · total" cria uma *tentativa* (`attempt.ts`): chave de idempotência ligada ao payload exato, salva em `sessionStorage` antes do envio. Botão desabilitado + trava em ref impedem cliques repetidos.
5. Timeout/erro de rede: reenvio automático com a mesma chave; refresh no meio do envio: ao voltar ao checkout a tentativa enviada é reenviada e recupera o mesmo pedido.
6. `QUOTE_STALE`/`AVAILABILITY_CONFLICT`: a UI mostra a nova cotação e o que mudou, e exige nova confirmação (nova chave, pois o payload mudou).
7. Página do pedido: `pending` (pode recarregar com segurança) → `confirmed` (recibo) ou `rejected` (itens preservados). O **recibo** é renderizado só do snapshot do pedido.

## 8. Mocks (MSW)

- `src/mocks/db.ts`: "backend" em memória, persistido em `localStorage` (`kurio:mock-db`); `reset()` restaura as fixtures integralmente. Catálogo, favoritos, carrinho, perfil, carteiras e pedidos compartilham o mesmo estado, e toda mudança de NFT/pedido vira evento Socket.IO.
- `src/mocks/http.ts`: latência, offline e falhas por cenário (PRNG com semente fixa → reproduzível).
- `src/mocks/socket.ts`: servidor Socket.IO sobre a interceptação de WebSocket do MSW com `@mswjs/socket.io-binding`.
- `src/mocks/control.ts`: superfície de controle (`window.__kurioMocks`) usada pelo painel e pelos testes. Ela altera o **servidor**; a UI só percebe via REST e Socket.IO.

### Transporte Socket.IO no ambiente de mocks — limitações

- Apenas o transporte **WebSocket** (`transports: ['websocket']`); long-polling não é simulado.
- O binding não implementa *heartbeat*: o servidor simulado envia os pings do Engine.IO (`"2"`) a cada 20 s.
- O binding não lê o `auth` do handshake nem tem *rooms*/namespaces: a sessão é identificada pelo evento `session:subscribe` e a entrega por usuário é feita no servidor simulado.
- O MSW remove o prefixo `/socket.io/` antes de casar a URL, o que tornaria a conexão indistinguível do WebSocket de HMR do Vite; por isso o cliente usa `path: '/realtime'` (um servidor real deve escutar no mesmo path).
- `engine.io-client` captura `WebSocket` ao ser avaliado; o `socket.io-client` é carregado sob demanda depois que o MSW inicia.
- Somente nos builds com mocks, o `tldts` (lista de sufixos públicos usada pelo cookie jar do MSW) é substituído por `src/mocks/vendor/tldts-lite.ts` — a app não usa cookies.
- O navegador embutido de algumas IDEs bloqueia Service Workers; use Chrome/Edge/Firefox.

## 9. Acessibilidade

Link "Pular para o conteúdo"; foco movido para `<main>` a cada navegação; diálogos e drawers (Radix) prendem e devolvem o foco; todos os campos com `<label>`, `aria-invalid` e `aria-describedby` apontando para erro/dica; região `aria-live` global (`announce()`) para mutations e eventos em tempo real; toggles com `aria-pressed`; estados também por texto/ícone (ex.: "esgotada", "Desconectada"); skeletons com `aria-busy`; `prefers-reduced-motion` desliga shimmer e animações; área de toque ≥ 24 px; contraste AA nas cores do Figma.

## 10. Performance

- Entry mínimo; app e mocks baixam em paralelo; rotas com code splitting (a do detalhe vai junto do app porque seu LCP depende de dados).
- **App shell estático** em `index.html` (cabeçalho e, na home, o mesmo hero do app) pinta antes do JavaScript; o app começa a baixar logo após esse primeiro paint (na home, depois da imagem do hero, com teto de 2 s). Funciona igual para qualquer usuário, não só na auditoria.
- Imagens WebP com `width/height`, `loading="lazy"` fora da dobra, `fetchpriority="high"` no LCP; fonte local (Fontsource) com `font-display: swap`; skeletons com as mesmas dimensões do conteúdo (CLS ≈ 0).
- Resultados e justificativas: `lighthouse/reports/resultado.md`.

## 11. Desvios do Figma e decisões de UX

- **Assets**: o arquivo do Figma não estava acessível pela API (sem permissão de edição). As quatro artes dos macacos foram recortadas das telas exportadas e convertidas para WebP 480 px; as variações da galeria são recortes (rosto, roupa, acessórios) da mesma arte. A fonte foi identificada como monoespaçada e implementada com **Roboto Mono** (variável, servida localmente).
- **Contagens da sidebar** (33, 12, 65…) vêm da API (facetas calculadas sobre as 40 fixtures), não dos números estáticos do layout.
- **Frames mobile** não foram fornecidos: o layout mobile segue o mesmo sistema visual (menu em drawer, filtros em drawer, grade de 2 colunas, linhas do carrinho empilhadas). Perfil, carteiras e confirmação também foram adaptados.
- **"Mercado"** é uma rota própria (`/mercado`) com o catálogo; "Início" mantém hero + catálogo + blocos editoriais. Detalhe, carrinho e pagamento destacam "Mercado" no menu, como no Figma.
- **Login/Cadastro** são rotas (`/entrar`, `/cadastro`) renderizadas como diálogo sobre a home, como nos frames. Login social e "Esqueceu a senha?" informam que não estão disponíveis (não simulam sucesso).
- **Confirmação** é um diálogo de recibo; antes dele há os estados "aguardando confirmação" e "pagamento recusado", que não estavam desenhados.
- **Pagamento**: a etapa de **revisão** foi adicionada antes do envio; as opções de carteira mostram as carteiras **cadastradas** do usuário com o estado de conexão; "Usar outra carteira?" permite receber em outro endereço pagando com a carteira selecionada.
- **"Ver no Etherscan"** abre um link simulado (Sepolia) e a interface avisa que a transação existe só na demonstração.
- Páginas editoriais (Criadores, Aprenda, Central de ajuda) e as seções Atividade, Ofertas, Arquivos, Suporte, Minha coleção e Estúdio aparecem como "Em breve". "Lista de interesse" foi implementada (favoritos).
- Desconto exibido como "(-) 0.00 ETH" (o Figma mostra "(-) 00.00").
- **Acessibilidade**: textos de corpo usam um laranja um pouco mais claro (`#d79a63`) para manter contraste AA; os pontos de carrossel ganharam área de toque de 24 px sem mudar o visual.

## 12. Limitações conhecidas

- Os baselines visuais foram gerados no Windows; em outro SO a renderização de fontes difere — regenere com `pnpm test:e2e:update` no ambiente de CI.
- Não há backend real: com `VITE_ENABLE_MOCKS=false`, o app espera uma API compatível com os contratos acima em `VITE_API_URL` e um servidor Socket.IO em `path: '/realtime'` na mesma origem.
- A persistência do mock é por navegador (localStorage); cada aba/contexto tem seu próprio "servidor".
