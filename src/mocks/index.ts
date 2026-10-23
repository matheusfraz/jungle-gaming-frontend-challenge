export async function startMocks() {
  const { worker } = await import('./browser')

  await worker.start({
    onUnhandledRequest: 'warn',
  })
}
