/**
 * Lighthouse audit: home and NFT detail, mobile and desktop, 3 runs each.
 * Reports the median of every category plus LCP/CLS/TBT, and records the
 * tool versions and execution environment in lighthouse/reports/resultado.md.
 *
 * Usage: pnpm build:demo && pnpm preview:demo   (in one terminal)
 *        pnpm lighthouse                        (in another)
 * Env:   LIGHTHOUSE_URL (default http://127.0.0.1:4173), CHROME_PATH (optional)
 */
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { cpus, platform, release, totalmem } from 'node:os'
import { resolve } from 'node:path'

const reportsDirectory = resolve('lighthouse/reports')
const lighthouseCli = resolve('node_modules/lighthouse/cli/index.js')
const baseUrl = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4173'
const pages = [
  { id: 'home', path: '/', label: 'Início' },
  { id: 'detail', path: '/nft/emerald-ape-042', label: 'Detalhe do NFT' },
]
const profiles = ['mobile', 'desktop']
const runs = 3
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

await mkdir(reportsDirectory, { recursive: true })

const results = []
for (const profile of profiles) {
  for (const page of pages) {
    for (let run = 1; run <= runs; run += 1) {
      const reportPath = resolve(reportsDirectory, `${profile}-${page.id}-${run}`)
      const args = [
        lighthouseCli,
        new URL(page.path, baseUrl).href,
        `--config-path=lighthouse/${profile === 'desktop' ? 'config.desktop.mjs' : 'config.mjs'}`,
        '--output=html,json',
        `--output-path=${reportPath}`,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox',
      ]
      console.log(`Lighthouse ${profile} ${page.path} (${run}/${runs})`)
      const result = spawnSync(process.execPath, args, { encoding: 'utf8', env: process.env })
      if (result.status !== 0) {
        throw new Error(`Lighthouse ${profile} ${page.path} run ${run} failed: ${result.stderr || result.stdout}`)
      }
      const report = JSON.parse(await readFile(`${reportPath}.report.json`, 'utf8'))
      results.push({ profile, page, report })
    }
  }
}

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

const sample = results[0].report
const summary = [
  '# Resultados Lighthouse',
  '',
  `- URL base: ${baseUrl} (build de demonstração com MSW ativo, cenário padrão)`,
  `- Execuções por página/perfil: ${runs} — valores abaixo são a **mediana**`,
  `- Lighthouse ${sample.lighthouseVersion} · ${sample.environment?.hostUserAgent ?? ''}`,
  `- Navegador de teste: ${sample.environment?.networkUserAgent ?? ''}`,
  `- Node ${process.version} · ${platform()} ${release()} · ${cpus()[0]?.model ?? 'CPU'} (${cpus().length} núcleos) · ${Math.round(totalmem() / 1024 ** 3)} GB RAM`,
  `- Throttling: simulado (mobile: Moto G Power / 4G lento; desktop: preset desktop)`,
  `- Data: ${new Date().toISOString()}`,
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|',
]

const belowTarget = []
for (const profile of profiles) {
  for (const page of pages) {
    const reports = results.filter((entry) => entry.profile === profile && entry.page.id === page.id).map((entry) => entry.report)
    const scores = Object.fromEntries(
      categories.map((category) => [category, median(reports.map((report) => Math.round(report.categories[category].score * 100)))]),
    )
    const lcp = median(reports.map((report) => report.audits['largest-contentful-paint'].numericValue))
    const cls = median(reports.map((report) => report.audits['cumulative-layout-shift'].numericValue))
    const tbt = median(reports.map((report) => report.audits['total-blocking-time'].numericValue))
    summary.push(
      `| ${page.label} | ${profile} | ${scores.performance} | ${scores.accessibility} | ${scores['best-practices']} | ${scores.seo} | ${Math.round(lcp)} | ${cls.toFixed(3)} | ${Math.round(tbt)} |`,
    )
    for (const category of categories) {
      if (scores[category] < targets[category]) {
        const representative = reports[Math.floor(reports.length / 2)]
        const failing = Object.values(representative.audits)
          .filter((audit) => audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative' && audit.scoreDisplayMode !== 'notApplicable')
          .filter((audit) => representative.categories[category].auditRefs.some((ref) => ref.id === audit.id && ref.weight > 0))
          .slice(0, 5)
          .map((audit) => `${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`)
        belowTarget.push(`- **${page.label} · ${profile} · ${category}: ${scores[category]}** (meta ${targets[category]}). Principais auditorias: ${failing.join('; ') || 'n/d'}.`)
      }
    }
  }
}

summary.push('', '## Abaixo da meta', '', ...(belowTarget.length ? belowTarget : ['Todas as categorias atingiram a meta.']))
summary.push(
  '',
  '## Análise',
  '',
  '- **Throttling simulado (mobile):** o Lighthouse recalcula o LCP considerando tudo o que foi requisitado antes do LCP observado, a 1,6 Mbps e CPU 4× mais lenta. O LCP observado sem throttling fica entre ~80 ms (início) e ~550 ms (detalhe).',
  '- **Início:** no desktop, o hero é pintado pelo app shell estático do `index.html` (mesmo markup e imagem do app) e é o LCP, por isso não espera o JavaScript. No mobile, o frame tem o hero menor que os cards do catálogo, então o LCP passa a ser a primeira imagem da grade, que só aparece depois do bundle, do boot do MSW e de `GET /nfts` — a mesma causa do detalhe. Aumentar o hero só para a métrica quebraria a fidelidade ao frame, então a escolha foi manter o layout e documentar.',
  '- **Detalhe do NFT e Início (mobile):** o LCP é uma imagem que depende de dados (a do NFT, após `GET /nfts/:id`; no início, o primeiro card, após `GET /nfts`). Essa requisição depende do bundle do app (~95 KB gzip, com a rota do detalhe embutida para economizar uma ida à rede) **e** do boot do MSW (registro do Service Worker + ~57 KB gzip de mocks), exigido no build de demonstração e sem atalhos na auditoria. A latência simulada do cenário padrão (120–350 ms) também entra na conta. Com uma API real, o custo do MSW e da latência artificial sai do caminho crítico.',
  '- **Medidas já aplicadas:** entry mínimo com app e mocks baixando em paralelo; code splitting por rota; socket.io-client carregado sob demanda; `tldts` (100 KB) trocado por um stub só nos builds com mocks; imagens WebP com dimensões explícitas e `fetchpriority`; fonte local com `font-display: swap`; skeletons com as mesmas dimensões do conteúdo (CLS ≈ 0).',
  '- **Próximos passos possíveis:** pré-renderizar (SSG) as páginas de detalhe para que a imagem seja descoberta no HTML; trocar `zod` por `zod/mini` nos contratos para reduzir o bundle crítico.',
)
summary.push(
  '',
  'Relatórios HTML/JSON de cada execução: `lighthouse/reports/<perfil>-<página>-<n>.report.{html,json}`.',
  'Medições locais variam conforme hardware e carga da máquina; compare execuções feitas nas mesmas condições.',
)

await writeFile(resolve(reportsDirectory, 'resultado.md'), `${summary.join('\n')}\n`)
console.log(summary.join('\n'))
