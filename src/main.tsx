import '@fontsource-variable/roboto-mono/wght.css'
import './styles/index.css'

/*
 * Tiny entry: the app and (when enabled) the mock backend are fetched in
 * parallel, and the app only renders after MSW is intercepting requests and
 * WebSockets.
 */

/**
 * Resolves after the static shell (index.html) has painted. When the shell
 * shows the home hero, the hero image gets the bandwidth first (capped at 2 s
 * so a slow image never holds the app back).
 */
async function afterFirstPaint() {
  const hero = document.querySelector<HTMLImageElement>('#shell-main img')
  if (hero && !hero.complete) {
    await Promise.race([
      new Promise((resolve) => hero.addEventListener('load', resolve, { once: true })),
      new Promise((resolve) => hero.addEventListener('error', resolve, { once: true })),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

async function startApplication() {
  // Let the static shell (header + home hero) paint before the app bundle
  // competes for bandwidth; the delay is a single frame.
  await afterFirstPaint()
  const app = import('./app')
  // Compared literally so Vite drops the mock layer from non-mock builds.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMocks } = await import('./mocks')
    await startMocks()
  }
  const { renderApp } = await app

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element "#root" was not found.')
  renderApp(rootElement)
}

void startApplication().catch((error: unknown) => {
  console.error('Application bootstrap failed.', error)
  const rootElement = document.getElementById('root')

  if (rootElement) {
    rootElement.textContent = 'Não foi possível iniciar a aplicação. Consulte o console.'
  }
})
