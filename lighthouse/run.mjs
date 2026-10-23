import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const reportsDirectory = resolve('lighthouse/reports')
const lighthouseCli = resolve('node_modules/lighthouse/cli/index.js')
const baseUrl = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4173'
const pages = ['/']
const profiles = ['mobile', 'desktop']
const runs = 3

await mkdir(reportsDirectory, { recursive: true })

const results = []

for (const profile of profiles) {
  for (const page of pages) {
    for (let run = 1; run <= runs; run += 1) {
      const reportPath = resolve(
        reportsDirectory,
        `${profile}-${page === '/' ? 'home' : 'page'}-${run}`,
      )
      const args = [
        lighthouseCli,
        new URL(page, baseUrl).href,
        '--config-path=lighthouse/config.mjs',
        '--output=html,json',
        `--output-path=${reportPath}`,
        `--form-factor=${profile}`,
        '--quiet',
        '--chrome-flags=--headless --no-sandbox',
      ]

      if (profile === 'desktop') {
        args.push('--screenEmulation.disabled')
      }

      const result = spawnSync(process.execPath, args, { encoding: 'utf8' })

      if (result.status !== 0) {
        throw new Error(
          `Lighthouse ${profile} run ${run} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`,
        )
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

const summary = [
  '# Resultados Lighthouse',
  '',
  `URL base: ${baseUrl}`,
  `Execuções por página/perfil: ${runs}`,
  '',
  '| Página | Perfil | LCP (ms) | CLS | TBT (ms) | Desempenho |',
  '|---|---|---:|---:|---:|---:|',
]

const justifications = ['## Justificativas', '']

for (const profile of profiles) {
  for (const page of pages) {
    const reports = results
      .filter((result) => result.profile === profile && result.page === page)
      .map((result) => result.report)
    const metrics = {
      lcp: median(reports.map((report) => report.audits['largest-contentful-paint'].numericValue)),
      cls: median(reports.map((report) => report.audits['cumulative-layout-shift'].numericValue)),
      tbt: median(reports.map((report) => report.audits['total-blocking-time'].numericValue)),
      performance: median(reports.map((report) => report.categories.performance.score * 100)),
    }

    summary.push(
      `| ${page} | ${profile} | ${Math.round(metrics.lcp)} | ${metrics.cls.toFixed(3)} | ${Math.round(metrics.tbt)} | ${Math.round(metrics.performance)} |`,
    )

    const representativeReport = reports[Math.floor(reports.length / 2)]
    const diagnostics = [
      'render-blocking-insight',
      'unused-javascript',
      'uses-optimized-images',
      'uses-text-compression',
    ]
      .map((id) => representativeReport.audits[id])
      .filter((audit) => audit && audit.score < 1 && audit.displayValue)
      .map((audit) => `${audit.title}: ${audit.displayValue}`)
    const findings = diagnostics.length
      ? diagnostics.join('; ')
      : 'sem oportunidades adicionais sinalizadas pelos diagnósticos selecionados'

    justifications.push(
      `- **${page} · ${profile}:** LCP mediano de ${Math.round(metrics.lcp)} ms, CLS de ${metrics.cls.toFixed(3)} e TBT de ${Math.round(metrics.tbt)} ms. Diagnósticos da execução central: ${findings}.`,
    )
  }
}

summary.push(
  '',
  ...justifications,
  '',
  'A medição cobre somente a rota inicial provisória; os resultados não representam páginas de catálogo, NFT ou fluxos transacionais ainda não implementados.',
  '',
  'Medições locais variam conforme hardware e navegador. Compare execuções feitas em condições equivalentes e investigue regressões antes de usar os números como critério de liberação.',
)

await writeFile(resolve(reportsDirectory, 'resultado.md'), `${summary.join('\n')}\n`)
