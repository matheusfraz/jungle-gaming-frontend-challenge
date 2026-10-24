/**
 * Artworks that already have a 2x (960 px) version in public/nfts, built from
 * a high-resolution original with scripts/build-art.mjs.
 */
const HI_RES_ARTWORKS = new Set(['emerald', 'sage', 'ivory', 'golden'])

/**
 * `srcset` for NFT art: high-density screens get the 2x file, everyone else
 * keeps the 1x file. Returns undefined when no 2x version exists.
 */
export function artSrcSet(src: string | undefined): string | undefined {
  const match = src?.match(/^\/nfts\/ape-([a-z]+)(?:-[a-z]+)?\.webp$/)
  if (!src || !match || !HI_RES_ARTWORKS.has(match[1])) return undefined
  return `${src} 1x, ${src.replace(/\.webp$/, '@2x.webp')} 2x`
}
