import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      generatedRouteTree: './src/routeTree.gen.ts',
      codeSplittingOptions: {
        // The NFT detail ships with the app chunk: its LCP image depends on
        // data, so one round trip less matters. The home paints its hero from
        // the static shell in index.html, so it can stay lazy like the rest.
        splitBehavior: ({ routeId }) => (routeId === '/nft/$nftId' ? [] : undefined),
      },
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': src(''),
      // Mock builds only: MSW's cookie jar pulls a 100 KB public-suffix list.
      ...(mode === 'mocks' ? { tldts: src('mocks/vendor/tldts-lite.ts') } : {}),
    },
  },
}))
