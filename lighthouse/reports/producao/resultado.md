# Resultados Lighthouse

- URL base: https://kurio-omega.vercel.app (build de demonstração com MSW ativo, cenário padrão)
- Execuções por página/perfil: 3 — valores abaixo são a **mediana**
- Lighthouse 13.5.0 · Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36
- Navegador de teste: Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36
- Node v24.11.1 · win32 10.0.19045 · 13th Gen Intel(R) Core(TM) i7-13620H (16 núcleos) · 16 GB RAM
- Throttling: simulado (mobile: Moto G Power / 4G lento; desktop: preset desktop)
- Data: 2026-10-24T18:32:48.493Z

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | 91 | 100 | 100 | 100 | 3331 | 0.000 | 139 |
| Detalhe do NFT | mobile | 93 | 100 | 100 | 100 | 2945 | 0.000 | 107 |
| Início | desktop | 100 | 100 | 100 | 100 | 464 | 0.000 | 0 |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 643 | 0.003 | 0 |

## Abaixo da meta

Todas as categorias atingiram a meta.

## Análise

- **Throttling simulado (mobile):** o Lighthouse recalcula o LCP considerando tudo o que foi requisitado antes do LCP observado, a 1,6 Mbps e CPU 4× mais lenta. O LCP observado sem throttling fica entre ~80 ms (início) e ~550 ms (detalhe).
- **Início:** no desktop, o hero é pintado pelo app shell estático do `index.html` (mesmo markup e imagem do app) e é o LCP, por isso não espera o JavaScript. No mobile, o frame tem o hero menor que os cards do catálogo, então o LCP passa a ser a primeira imagem da grade, que só aparece depois do bundle, do boot do MSW e de `GET /nfts` — a mesma causa do detalhe. Aumentar o hero só para a métrica quebraria a fidelidade ao frame, então a escolha foi manter o layout e documentar.
- **Detalhe do NFT e Início (mobile):** o LCP é uma imagem que depende de dados (a do NFT, após `GET /nfts/:id`; no início, o primeiro card, após `GET /nfts`). Essa requisição depende do bundle do app (~95 KB gzip, com a rota do detalhe embutida para economizar uma ida à rede) **e** do boot do MSW (registro do Service Worker + ~57 KB gzip de mocks), exigido no build de demonstração e sem atalhos na auditoria. A latência simulada do cenário padrão (120–350 ms) também entra na conta. Com uma API real, o custo do MSW e da latência artificial sai do caminho crítico.
- **Medidas já aplicadas:** entry mínimo com app e mocks baixando em paralelo; code splitting por rota; socket.io-client carregado sob demanda; `tldts` (100 KB) trocado por um stub só nos builds com mocks; imagens WebP com dimensões explícitas e `fetchpriority`; fonte local com `font-display: swap`; skeletons com as mesmas dimensões do conteúdo (CLS ≈ 0).
- **Próximos passos possíveis:** pré-renderizar (SSG) as páginas de detalhe para que a imagem seja descoberta no HTML; trocar `zod` por `zod/mini` nos contratos para reduzir o bundle crítico.

Relatórios HTML/JSON de cada execução: `lighthouse/reports/producao/<perfil>-<página>-<n>.report.{html,json}`.
Medições locais variam conforme hardware e carga da máquina; compare execuções feitas nas mesmas condições.
