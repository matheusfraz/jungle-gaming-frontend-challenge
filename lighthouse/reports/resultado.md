# Resultados Lighthouse

URL base: http://127.0.0.1:4173
Execuções por página/perfil: 3

| Página | Perfil | LCP (ms) | CLS | TBT (ms) | Desempenho |
|---|---|---:|---:|---:|---:|
| / | mobile | 2012 | 0.000 | 27 | 98 |
| / | desktop | 2013 | 0.000 | 29 | 82 |

## Justificativas

- **/ · mobile:** LCP mediano de 2012 ms, CLS de 0.000 e TBT de 27 ms. Diagnósticos da execução central: Render-blocking requests: Est savings of 150 ms; Reduce unused JavaScript: Est savings of 80 KiB.
- **/ · desktop:** LCP mediano de 2013 ms, CLS de 0.000 e TBT de 29 ms. Diagnósticos da execução central: Render-blocking requests: Est savings of 150 ms; Reduce unused JavaScript: Est savings of 80 KiB.

A medição cobre somente a rota inicial provisória; os resultados não representam páginas de catálogo, NFT ou fluxos transacionais ainda não implementados.

Medições locais variam conforme hardware e navegador. Compare execuções feitas em condições equivalentes e investigue regressões antes de usar os números como critério de liberação.
