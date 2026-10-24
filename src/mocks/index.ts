/**
 * Mock backend bootstrap. Loaded only when VITE_ENABLE_MOCKS=true (dev:mocks,
 * the demo build and the E2E runs), before the app renders, so the WebSocket
 * used by socket.io-client is intercepted from the very first connection.
 */
export async function startMocks() {
  const [{ worker }, { mockControl }, { resumePendingOrders }] = await Promise.all([
    import('./browser'),
    import('./control'),
    import('./db'),
  ])

  await worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api')) print.warning()
    },
    quiet: true,
  })

  window.__kurioMocks = mockControl
  resumePendingOrders()
}
