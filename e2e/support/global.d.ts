export {}

declare global {
  interface Window {
    /** Mock backend control surface (see src/mocks/control.ts). */
    __kurioMocks?: unknown
  }
}
