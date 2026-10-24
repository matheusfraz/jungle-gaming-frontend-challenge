# Kurio — Marketplace de NFTs

Implementação do desafio Frontend da Jungle Gaming. A Kurio é um marketplace de NFTs com descoberta, compra e conta do colecionador, em desktop e mobile. A API REST e o tempo real (Socket.IO) são simulados no navegador com MSW, então a aplicação funciona sem backend.

- **Aplicação publicada:** https://kurio-omega.vercel.app
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Resultados Lighthouse:** [local](./lighthouse/reports/resultado.md) e [aplicação publicada](./lighthouse/reports/producao/resultado.md)
- **Relatórios Playwright (HTML):** [local](./e2e/reports/local/index.html) e [aplicação publicada](./e2e/reports/producao/index.html)

## Sumário

1. [Teste em 5 minutos](#teste-em-5-minutos)
2. [Tecnologias](#tecnologias)
3. [Como rodar](#como-rodar)
4. [Contas, cupons e dados de teste](#contas-cupons-e-dados-de-teste)
5. [Telas e fluxos](#telas-e-fluxos)
6. [Campos dos formulários: regras e exemplos que funcionam](#campos-dos-formulários-regras-e-exemplos-que-funcionam)
7. [Carteiras: como funcionam](#carteiras-como-funcionam)
8. [Painel "Mocks" e cenários](#painel-mocks-e-cenários)
9. [Reproduzindo os fluxos de falha](#reproduzindo-os-fluxos-de-falha)
10. [Comandos](#comandos)
11. [Testes E2E (Playwright)](#testes-e2e-playwright)
12. [Lighthouse](#lighthouse)
13. [Deploy (Vercel)](#deploy-vercel)
14. [Estrutura do projeto](#estrutura-do-projeto)

## Teste em 5 minutos

Roteiro para ver a compra completa, do catálogo ao recibo. Funciona no site publicado ou em `pnpm dev:mocks`.

1. Abra https://kurio-omega.vercel.app e clique em **Entrar**.
2. Entre com `ana@kurio.test` / `Kurio2026`. A Ana já tem carteiras cadastradas.
3. Na página inicial, clique em um NFT (ex.: **Emerald Ape #042**), escolha a edição e clique em **Comprar**. Você vai para o carrinho.
4. No carrinho, aplique o cupom `KURIO10` (opcional) e clique em **Conectar e finalizar**.
5. Na página de pagamento, o formulário já vem preenchido com a carteira principal. Clique em **Conectar carteira** e depois em **Confirmar compra**.
6. Na revisão, confira os valores e clique em **Confirmar compra · total**.
7. O pedido fica **pendente** por cerca de 2,5 s e depois é **confirmado**. O recibo mostra os NFTs e o botão **Ver no Etherscan**, que abre o explorador simulado com a transação.

Para testar com uma conta nova, veja [Criar conta](#criar-conta) e [Cadastrar uma carteira](#cadastrar-uma-carteira-passo-a-passo).

## Tecnologias

| Tecnologia | Versão | Uso no projeto |
|---|---|---|
| React | 19 | Interface |
| TypeScript | 6 | Tipagem estrita em app, testes e configs |
| Vite | 8 | Dev server e build |
| TanStack Router | 1.170 | Rotas por arquivo (`src/routes`), rotas protegidas, busca na URL e code splitting |
| TanStack Query | 5 | Cache de dados do servidor, invalidação, retry e atualizações otimistas |
| Axios | 1.20 | Cliente HTTP, com token, timeout e erros padronizados |
| Zod | 4 | Contratos da API e validação dos formulários (as mesmas regras no cliente e no mock) |
| React Hook Form | 7 | Formulários |
| Socket.IO (client) | 4.8 | Tempo real: preço, estoque e status de pedidos |
| Tailwind CSS | 4 | Estilos |
| shadcn/ui (Radix UI) | — | Componentes acessíveis: diálogo, select, sheet, checkbox… |
| Sonner | 2 | Notificações (toasts) |
| decimal.js | 10 | Cálculo de valores em ETH sem erro de arredondamento |
| MSW + @mswjs/socket.io-binding | 2.15 / 0.2 | API REST e servidor Socket.IO simulados no navegador |
| Playwright | 1.64 | Testes E2E e regressão visual (desktop 1440 px e mobile 390 px) |
| Lighthouse | 13.5 | Auditoria de performance, acessibilidade, boas práticas e SEO |
| ESLint | 10 | Lint |
| sharp | 0.35 | Script que gera as imagens dos NFTs (1x/2x, recortes e miniaturas) |
| Vercel | — | Deploy |

## Como rodar

### Requisitos

- Node.js 20.19+ ou 22.12+ (testado com 24)
- pnpm 10+
- Chrome, Edge ou Firefox, com Service Workers liberados (o MSW depende deles)

### Instalação

```sh
pnpm install
pnpm dev:mocks
```

Abra http://localhost:5173. Para os testes E2E, instale também o Chromium do Playwright (uma vez):

```sh
pnpm exec playwright install chromium
```

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `false` (`true` em `.env.mocks`) | Liga a API simulada (REST + Socket.IO). Usada por `dev:mocks`, `build:demo` e pelos testes. |
| `VITE_API_URL` | `/api` | Base das chamadas REST. |

`pnpm dev` e `pnpm build` usam `.env.example` como referência (mocks desligados, esperando uma API real). `pnpm dev:mocks` e `pnpm build:demo` usam `.env.mocks`, que já está no repositório.

## Contas, cupons e dados de teste

### Contas prontas

| E-mail | Senha | O que tem |
|---|---|---|
| `ana@kurio.test` | `Kurio2026` | Carteira principal (MetaMask, Ethereum) e secundária (Coinbase, Polygon), 2 favoritos. Ideal para comprar direto. |
| `bruno@kurio.test` | `Kurio2026` | Sem carteiras. Ideal para testar o cadastro de carteira. |

### Criar conta

Na aba **Criar conta** (ou em `/cadastro`), qualquer e-mail com formato válido funciona, mesmo fictício. A conta é criada na hora e você já entra logado. Depois dá para sair e entrar de novo com o mesmo e-mail e senha.

| Campo | Exemplo que funciona |
|---|---|
| Nome de usuário | `maria_silva` |
| E-mail | `maria@gmail.com` |
| Senha / Confirmar senha | `Senha1234` |

As contas criadas ficam salvas no navegador (`localStorage`). Elas somem se os dados do site forem limpos, se você usar outro navegador ou se clicar em "Resetar dados" no painel Mocks.

### Cupons (carrinho)

| Cupom | Resultado |
|---|---|
| `KURIO10` | 10% de desconto |
| `GENESIS25` | 25% de desconto |
| `VERAO2025` | Recusado: cupom expirado |
| qualquer outro (ex.: `XYZ`) | Recusado: cupom inválido |

### NFTs para testar

| NFT | Endereço |
|---|---|
| Emerald Ape #042 | `/nft/emerald-ape-042` |
| Ivory Baron #088 | `/nft/ivory-baron-088` |
| Golden Beat #207 | `/nft/golden-beat-207` |

Cada NFT tem até 4 edições: `1/1`, `1/10`, `1/50` e `ABERTA`. Cada edição tem estoque próprio e um limite por pedido (1, 5, 10 e 20, respectivamente). Edições esgotadas aparecem desabilitadas.

## Telas e fluxos

| Tela | Rota | Login | O que dá para fazer |
|---|---|---|---|
| Início | `/` | não | Destaques, catálogo com abas (Todos os NFTs, Novos lançamentos, Em alta), filtros por coleção e rede, ordenação e paginação |
| Mercado | `/mercado` | não | Mesmo catálogo, com busca. Filtros, busca e página ficam na URL, então voltar e recarregar preservam o estado. |
| Busca | ícone de lupa | não | Busca por nome do NFT, coleção ou número do token |
| Detalhe do NFT | `/nft/:id` | não | Galeria, escolha de edição e quantidade, favoritar, comprar e "Mais desta coleção" |
| Carrinho | `/carrinho` | não | Alterar quantidades, remover itens, aplicar cupom e ver o resumo com taxa de rede. O carrinho de visitante é mesclado ao da conta no login. |
| Entrar / Criar conta | `/entrar`, `/cadastro` | não | Login, cadastro e retorno para a página onde você estava |
| Pagamento | `/pagamento` | sim | Perfil do colecionador, escolha e conexão da carteira, revisão e confirmação |
| Pedido / recibo | `/pedido/:id` | sim | Status em tempo real (pendente, confirmado ou recusado), recibo e link para o explorador |
| Explorador simulado | `/explorador/tx/:hash` | não | Detalhes da transação (aberto pelo botão "Ver no Etherscan") |
| Perfil | `/perfil` | sim | Dados do perfil, avatar e troca de senha |
| Carteiras | `/perfil/carteiras` | sim | Carteira principal e secundária |
| Lista de interesse | `/perfil/favoritos` | sim | NFTs favoritados |
| Criadores, Aprenda, Ajuda e seções "em breve" do perfil | — | — | Fora do escopo do desafio. Mostram "Em breve". |

### Fluxo de compra

```
Catálogo → Detalhe (edição + quantidade) → Comprar → Carrinho (cupom)
  → Conectar e finalizar → [Entrar, se for visitante] → Pagamento
  → Conectar carteira → Confirmar compra → Revisão → Confirmar compra · total
  → Pedido pendente → Confirmado (recibo) → Ver no Etherscan (explorador simulado)
```

- **Preço ou estoque mudaram:** se isso acontecer no carrinho ou na revisão, por evento em tempo real ou na hora de confirmar, a tela avisa e pede para revisar de novo. A compra nunca segue com o valor antigo.
- **Clique duplo, timeout ou refresh:** cada tentativa de compra usa uma chave de idempotência. Repetir o envio recupera o mesmo pedido, sem cobrança dupla.
- **Pagamento recusado:** o pedido fica como recusado e os itens continuam no carrinho.

### Pagamento: o que cada parte faz

- **Perfil do colecionador:** vem preenchido com os dados do perfil e da carteira selecionada. As regras de cada campo estão na [tabela abaixo](#campos-dos-formulários-regras-e-exemplos-que-funcionam).
- **Carteira e rede:** escolha a carteira que vai pagar (principal ou secundária). Ela precisa estar **conectada**: use **Conectar carteira**. Se ela estiver desconectada, **Confirmar compra** pede a conexão automaticamente.
- **Sem carteira cadastrada:** preencha os dados do colecionador (endereço, código de indicação, nome ENS… com os [exemplos abaixo](#campos-dos-formulários-regras-e-exemplos-que-funcionam)) e escolha o tipo de carteira. Ao clicar em **Confirmar compra**, esses dados são salvos como sua carteira principal, com as mesmas regras de `/perfil/carteiras`, e a compra segue para a revisão. Se preferir, use o botão **Cadastrar carteira** para cadastrar antes.
- **Usar outra carteira?** Marque para receber os NFTs em outro endereço. O pagamento continua saindo da carteira selecionada, e o campo **Endereço da carteira** fica editável para você informar o destino.
- **Revisão:** mostra itens, desconto, taxa de rede e total antes do envio.

## Campos dos formulários: regras e exemplos que funcionam

As mesmas regras valem no cadastro de carteira (`/perfil/carteiras`), no pagamento (`/pagamento`) e no perfil (`/perfil`). Cada campo mostra uma dica com exemplo na tela. As regras ficam em `src/contracts/account.ts` e valem no cliente e na API simulada.

| Campo | Regra | Exemplo válido | Exemplo inválido |
|---|---|---|---|
| Nome de exibição | Obrigatório, até 40 caracteres | `Ana Souza` | (vazio) |
| Nome de usuário | 3 a 20 caracteres: letras minúsculas, números e `_`. Não pode estar em uso. | `ana_souza` | `Ana Souza`, `ab` |
| Apelido da carteira | Obrigatório, até 30 caracteres | `Minha MetaMask` | (vazio) |
| Rede | Ethereum, Polygon ou Solana | `Ethereum` | — |
| Nome do perfil | Obrigatório, texto livre. É como o perfil aparece na carteira. | `Coleção da Ana` | (vazio) |
| Endereço da carteira | `0x` + exatamente 40 caracteres hexadecimais (0-9, a-f, maiúsculas ou minúsculas) | `0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed` | `0x123`, `5aAeb6…` (sem `0x`) |
| ENS ou carteira secundária (opcional) | Vazio, um nome ENS (`nome.eth` ou `nome.xyz`) ou outro endereço `0x` | (vazio), `kurio.eth`, `0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359` | `kurio`, `kurio.com` |
| Tipo de carteira | MetaMask, WalletConnect ou Coinbase Wallet | `MetaMask` | — |
| Código de indicação | 6 a 12 letras maiúsculas ou números, **começando com `KURIO`**. Pode digitar em minúsculas: o campo converte. | `KURIO2026`, `KURIOANA`, `kurio2026` | `ABCDEF12` (não começa com KURIO), `KUR` (curto) |
| E-mail | Formato `nome@dominio.tld` | `ana@gmail.com` | `ana@gmail`, `ana` |
| Nome ENS | Sufixo `.eth` ou `.xyz` no seletor + nome com letras minúsculas, números e hífen (mín. 3) | `.eth` + `ana-souza` | `Ana Souza`, `ab` |
| Observação do colecionador (pagamento) | Opcional, até 500 caracteres | `Presente de aniversário` | — |

Os endereços `0x5aAe…BeAed` e `0xfB69…d359` são exemplos públicos do padrão de endereços Ethereum (EIP-55), usados só para teste. Nenhuma transação real é feita.

### Cadastrar uma carteira (passo a passo)

1. Entre com `bruno@kurio.test` / `Kurio2026` (ou com uma conta nova).
2. Abra **Perfil → Carteiras** (`/perfil/carteiras`) e clique em **Adicionar** na carteira principal.
3. Preencha:

   | Campo | Valor |
   |---|---|
   | Nome de exibição | `Bruno Lima` (vem preenchido) |
   | Apelido da carteira | `Minha MetaMask` |
   | Rede | `Ethereum` |
   | Nome do perfil | `Coleção do Bruno` |
   | Endereço da carteira | `0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed` |
   | ENS ou carteira secundária | `kurio.eth` (ou deixe vazio) |
   | Tipo de carteira | `MetaMask` |
   | Código de indicação | `KURIO2026` |
   | E-mail | vem preenchido |
   | Nome ENS | `.eth` + `bruno-lima` |

4. Clique em **Salvar carteira**. Aparece "Carteira principal salva.".
5. Opcional: a carteira secundária usa os mesmos campos, mas com **outro endereço**, por exemplo `0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359`. Repetir o endereço da principal é recusado, a menos que você marque que a secundária é a mesma da principal.

Depois disso a carteira já aparece no pagamento.

## Carteiras: como funcionam

- **Principal e secundária:** cada conta tem até duas. A secundária só pode ser cadastrada depois da principal.
- **Conexão simulada:** não existe extensão de carteira real. "Conectar carteira" simula a aprovação, e o estado (conectada ou desconectada) fica guardado por carteira. Trocar o endereço de uma carteira conectada a desconecta.
- **Recusa:** no cenário `wallet-rejected`, a conexão é recusada para você ver a mensagem de erro e tentar de novo.
- **Rede:** é só informativa. A rede da carteira aparece no pagamento, e o explorador simulado mostra a transação.

## Painel "Mocks" e cenários

O botão **Mocks** (canto inferior esquerdo no desktop, aba lateral no mobile) aparece em todo build com mocks, inclusive no site publicado. Ele controla o "servidor" simulado. Dá para:

- trocar o cenário (tabela abaixo);
- disparar eventos em tempo real: aumentar preço, esgotar edição, reenviar o último evento, enviar evento antigo, derrubar a conexão por 5 s;
- expirar a sessão atual e liquidar pedidos pendentes na hora;
- ver as credenciais e os cupons de teste;
- **Resetar dados e recarregar**, que volta tudo ao estado inicial: NFTs, contas, carrinho e pedidos.

Também dá para escolher o cenário pela URL (`?mock-scenario=slow`, que vale para a aba) ou pelo console (`window.__kurioMocks.setScenario('slow')`, `window.__kurioMocks.reset()`).

| Cenário | Comportamento |
|---|---|
| `default` (Padrão) | Sucesso, latência de 120–350 ms com semente fixa |
| `instant` | Sucesso sem latência (usado nas baselines visuais) |
| `empty` | Catálogo vazio |
| `slow` | Toda resposta leva 2,5 s (skeletons) |
| `variable-latency` | 100 ms a 2 s por resposta, sequência determinística |
| `out-of-order` | Na listagem, requisições ímpares lentas e pares rápidas |
| `offline` | Toda chamada REST falha com erro de rede |
| `server-error` | Catálogo e detalhe respondem 500 |
| `flaky` | O primeiro GET de cada URL responde 503 (o retry recupera) |
| `session-expired` | Sessões novas expiram em 20 s |
| `favorite-failure` | Favoritar responde 500 (rollback otimista) |
| `checkout-price-change` | No 1º envio do pedido, o preço do 1º item sobe 0,05 ETH |
| `checkout-sold-out` | No 1º envio do pedido, a edição do 1º item esgota |
| `order-timeout` | O 1º envio grava o pedido, mas responde depois do timeout do cliente |
| `payment-rejected` | Pedidos pendentes são recusados |
| `wallet-rejected` | A conexão da carteira é recusada |

## Reproduzindo os fluxos de falha

| Fluxo | Como reproduzir |
|---|---|
| Skeletons / carregamento lento | `?mock-scenario=slow` e navegue pelo início, detalhe e carrinho |
| Erro 500 e nova tentativa | `?mock-scenario=server-error`; no painel, volte para "Padrão" e clique em "Tentar novamente" |
| Sem conexão | `?mock-scenario=offline` |
| Respostas fora de ordem | `?mock-scenario=out-of-order` e clique rápido em filtros diferentes |
| E-mail ou usuário já cadastrado | Crie conta com `ana@kurio.test` ou usuário `ana_coleciona` |
| E-mail com formato inválido | No cadastro, use `nome@gmail` (sem o domínio completo) |
| Endereço ou código de indicação inválido | Na carteira, use `0x123` ou o código `ABCDEF12` |
| Sessão expirada | Entre, abra `/perfil`, painel → "Expirar sessão atual" e clique em "Salvar" |
| Favorito com falha | Entre, painel → "Falha ao favoritar" e clique em "Favoritar" no detalhe |
| Cupom inválido ou expirado | No carrinho, use `XYZ` ou `VERAO2025` |
| Preço muda no carrinho ou no pagamento | Com um item no carrinho (ou na revisão), painel → "Aumentar preço do 1º item do carrinho" |
| Edição esgota | Painel → "Esgotar edição do 1º item do carrinho", ou cenário `checkout-sold-out` |
| Preço muda na confirmação | Cenário `checkout-price-change` e faça a compra até "Confirmar compra · total" |
| Timeout com recuperação | Cenário `order-timeout` e confirme a compra (o reenvio usa a mesma chave) |
| Pagamento recusado | Cenário `payment-rejected` |
| Carteira recusa conexão | Cenário `wallet-rejected` e clique em "Conectar carteira" |
| Queda do tempo real | Painel → "Derrubar conexão por 5 s" (com um pedido pendente, recarregue a página) |
| Evento duplicado ou antigo | Painel → "Reenviar último evento" / "Enviar evento antigo" |

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev:mocks` | Desenvolvimento com a API simulada (http://localhost:5173) |
| `pnpm dev` | Desenvolvimento contra uma API real |
| `pnpm build` | Verificação de tipos + build de produção |
| `pnpm build:demo` | Build de demonstração com mocks (é o que a Vercel publica) |
| `pnpm preview:demo` | Serve o build em http://127.0.0.1:4173 |
| `pnpm typecheck` | TypeScript (app, configs e testes) |
| `pnpm lint` | ESLint |
| `pnpm test:e2e` | Playwright (Chromium desktop 1440 px e mobile 390 px) |
| `pnpm test:e2e:ui` | Playwright em modo UI |
| `pnpm test:e2e:update` | Regenera os baselines visuais |
| `pnpm test:e2e:report` | Abre o último relatório HTML (`playwright-report/`) |
| `pnpm lighthouse` | Auditoria Lighthouse (precisa do `preview:demo` rodando) |

## Testes E2E (Playwright)

```sh
pnpm test:e2e
```

O Playwright sobe `pnpm dev:mocks` na porta 4173. Cada teste roda em contexto isolado, e o "servidor" MSW começa sempre das fixtures. Os testes controlam o cenário, o relógio (`page.clock`), a latência e os eventos em tempo real. Os testes de tempo real passam pelo cliente Socket.IO, e os de REST pelos handlers MSW.

Os relatórios HTML da última execução completa ficam versionados em `e2e/reports/`:

- `e2e/reports/local`: suíte contra `pnpm dev:mocks`.
- `e2e/reports/producao`: a mesma suíte contra https://kurio-omega.vercel.app, incluindo compra, falhas de pagamento e tempo real no build publicado.

Para abrir: `pnpm exec playwright show-report e2e/reports/local` (ou `producao`). Os testes pulados são variantes só do desktop, cobertas de outra forma no mobile; o motivo está no `test.skip` de cada um. Em uma falha, o Playwright guarda trace, screenshot e contexto do erro, e eles aparecem no relatório.

| Variável | Efeito |
|---|---|
| `E2E_BASE_URL` | Roda a suíte contra uma URL publicada (build de demonstração), sem subir servidor local |
| `E2E_REPORT` | Pasta do relatório HTML (padrão `playwright-report/`) |

```sh
E2E_BASE_URL=https://kurio-omega.vercel.app E2E_REPORT=e2e/reports/producao pnpm test:e2e
```

| Spec | Cobertura |
|---|---|
| `01-catalog` | Busca, filtros combinados, reset de paginação, ordenação, histórico, vazio, fora de ordem |
| `02-detail` | Acesso direto, galeria, edição esgotada, limite de quantidade, NFT inexistente, 404 |
| `03-auth` | Cadastro (validação, formato de e-mail, conflito, conta nova entrando de novo), login, retorno ao fluxo, expiração (controle e relógio), logout, troca de usuário |
| `04-favorites` | Visitante, persistência, falha + rollback + nova tentativa |
| `05-cart` | Quantidades, limites, cupom inválido/expirado/válido, remoção, persistência e merge no login |
| `06-purchase` | Do catálogo ao recibo; recibo como snapshot; explorador simulado; carteira recém-cadastrada; compra sem carteira salva (os dados do pagamento viram a carteira principal); remoção só do que foi comprado |
| `07-payment-failures` | Pagamento recusado, clique repetido, timeout + mesma chave, carteira recusada/desconexão |
| `08-account` | Perfil (validação e conflito), avatar, senha, carteiras com erros da API e os exemplos deste README |
| `09-realtime-checkout` | Preço/estoque via Socket.IO no carrinho e na revisão; `QUOTE_STALE` e esgotamento no servidor |
| `10-realtime-resilience` | Duplicados, antigos, reconexão com reconciliação REST, pedido pendente após queda/refresh, isolamento por usuário |
| `11-accessibility` | Skip link, foco em diálogos, erros associados aos campos, operação por teclado |
| `12-loading-errors` | Skeletons, 500, offline, 503 transitório, vazio |
| `13-responsive` | Sem overflow horizontal em 390, 768 e 1440 px em todas as telas |
| `visual/visual.spec.ts` | Regressão visual de início, detalhe, carrinho e pagamento (desktop e mobile) |

## Lighthouse

```sh
pnpm build:demo
pnpm preview:demo        # em um terminal
pnpm lighthouse          # em outro
```

Mede início e detalhe, mobile e desktop, 3 vezes cada, com o build de demonstração e o cenário padrão dos mocks. Gera HTML/JSON por execução e um `resultado.md` com medianas, LCP/CLS/TBT, versões, ambiente e justificativas. A configuração fica em `lighthouse/config.mjs` (mobile) e `lighthouse/config.desktop.mjs`. Para medir o site publicado:

```sh
LIGHTHOUSE_URL=https://kurio-omega.vercel.app LIGHTHOUSE_REPORTS=lighthouse/reports/producao pnpm lighthouse
```

| Página | Perfil | Local (`preview:demo`) | Publicada (Vercel) |
|---|---|---:|---:|
| Início | mobile | 82 | 92 |
| Detalhe do NFT | mobile | 83 | 94 |
| Início | desktop | 100 | 100 |
| Detalhe do NFT | desktop | 99 | 100 |

Valores de performance (mediana de 3 execuções). Acessibilidade, boas práticas e SEO ficaram em 100 em todos os casos. No site publicado, todas as categorias atingem a meta. A diferença vem principalmente da compressão (Brotli) e do HTTP/2 da CDN, que o `vite preview` local não aplica. A análise do mobile local está em [resultado.md](./lighthouse/reports/resultado.md).

## Deploy (Vercel)

Publicado em **https://kurio-omega.vercel.app**. Cada push na `main` gera um novo deploy de produção.

O `vercel.json` define `pnpm build:demo`, a saída `dist`, o cache dos assets e o rewrite de SPA, para que qualquer rota funcione com acesso direto e refresh. Basta importar o repositório na Vercel; nenhuma variável extra é necessária.

## Estrutura do projeto

```
src/
  routes/        rotas (TanStack Router, por arquivo)
  features/      telas e lógica por domínio: catalog, nft-detail, cart, checkout, orders, auth, account
  components/    layout (header, footer, barras mobile) e componentes compartilhados
  contracts/     contratos zod da API (usados pelo app e pelos mocks)
  lib/           cliente HTTP, sessão, storage, dinheiro, imagens
  realtime/      cliente Socket.IO e sincronização com o cache
  mocks/         API simulada (MSW): handlers REST, Socket.IO, fixtures, cenários e painel
e2e/             specs Playwright, fixtures de teste, baselines visuais e relatórios
lighthouse/      configuração, runner e relatórios
scripts/         geração das imagens dos NFTs e do favicon
assets-src/      imagens originais dos NFTs
```

Contratos dos endpoints, eventos de tempo real, estratégia de cache, sessão e decisões de projeto estão no [ARCHITECTURE.md](./ARCHITECTURE.md).
