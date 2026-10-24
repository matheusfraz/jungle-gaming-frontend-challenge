import { createRouter } from '@tanstack/react-router'
import { queryClient } from './lib/query/client'
import { routeTree } from './routeTree.gen'
import { NotFoundPage } from './routes/__root'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Data is preloaded through TanStack Query; let it decide freshness.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundPage,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
