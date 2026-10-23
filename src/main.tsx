import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { env } from './lib/env'
import { queryClient } from './lib/query/client'
import { router } from './router'
import './styles/index.css'

async function startApplication() {
  if (env.enableMocks) {
    const { startMocks } = await import('./mocks')
    await startMocks()
  }

  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element "#root" was not found.')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void startApplication().catch((error: unknown) => {
  console.error('Application bootstrap failed.', error)
  const rootElement = document.getElementById('root')

  if (rootElement) {
    rootElement.textContent = 'Não foi possível iniciar a aplicação. Consulte o console.'
  }
})
