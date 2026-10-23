# Jungle Gaming

Frontend foundation for the Jungle Gaming application. The current UI is a routed landing-page placeholder; catalog, account, cart, checkout, and order behavior still need product/API contracts.

## Requirements

- Node.js 20.19+ or 22.12+
- pnpm 10 or newer

## Setup

```sh
pnpm install
Copy-Item .env.example .env.local # PowerShell
pnpm dev
```

Open the URL printed by Vite. In Bash, use `cp .env.example .env.local` instead of `Copy-Item`.

## Environment and mocks

`VITE_API_URL` defaults to `/api`. Mock Service Worker is opt-in and is loaded dynamically only when enabled:

```sh
pnpm dev:mocks
```

This uses `.env.mocks`, which enables `VITE_ENABLE_MOCKS=true`. The current mock scenario is `GET /api/health`; no user credentials or business fixtures are defined yet. Add fictitious accounts and scenario controls only alongside the corresponding auth/product flows.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the app with the real API configuration |
| `pnpm dev:mocks` | Start with MSW enabled |
| `pnpm build` | Type-check and create a production build |
| `pnpm typecheck` | Run TypeScript project checks without bundling |
| `pnpm lint` | Run ESLint |
| `pnpm test:e2e` | Run the Playwright smoke test |
| `pnpm test:e2e:ui` | Open Playwright UI mode |
| `pnpm lighthouse` | Run three Lighthouse samples per page/profile and write a median summary |

Playwright starts the app with mocks enabled and runs its current smoke test in Chromium desktop and mobile emulation. Install Playwright's Chromium once with `pnpm exec playwright install chromium`. HTML test reports are written to `playwright-report/`; traces are retained on failure. Lighthouse requires a local Chrome/Chromium installation. Measure the production build rather than the Vite development server: run `pnpm build`, then `pnpm preview --host 127.0.0.1 --port 4173`, and run `pnpm lighthouse` in another terminal. Set `LIGHTHOUSE_URL` to measure another deployment.

## Test scenarios

The initial E2E test checks that the home route renders. The numbered scenario suite, visual baselines, and business-flow scenarios will be added as the behaviors and acceptance criteria are defined.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundaries, state ownership, and pending backend/design contracts.
