/**
 * Builds the NFT art served in public/nfts from a high-resolution original:
 * 1x (480 px) and 2x (960 px) WebP for the full art and the gallery crops,
 * plus 160/320 px thumbnails.
 *
 *   node scripts/build-art.mjs <artwork> <source-image> [insetFraction]
 *
 * `insetFraction` trims rounded/white corners from exported frames
 * (e.g. 0.04 trims 4% on every side). Originals live in assets-src/.
 */
import { resolve } from 'node:path'
import sharp from 'sharp'

const [, , artwork, source, insetArg] = process.argv
if (!artwork || !source) throw new Error('usage: node scripts/build-art.mjs <artwork> <source> [inset]')

const out = resolve('public/nfts')
// Gallery crops as fractions of the square art: [left, top, size].
const crops = {
  face: [90 / 480, 30 / 480, 300 / 480],
  outfit: [60 / 480, 200 / 480, 280 / 480],
  detail: [140 / 480, 110 / 480, 240 / 480],
}

const meta = await sharp(source).metadata()
const side = Math.min(meta.width, meta.height)
const inset = Math.round(side * Number(insetArg ?? 0))
const size = side - inset * 2
const base = await sharp(source).extract({ left: inset, top: inset, width: size, height: size }).toBuffer()

const write = (buffer, name, px, quality = 82) =>
  sharp(buffer).resize(px, px, { kernel: 'lanczos3' }).webp({ quality }).toFile(resolve(out, name))

await write(base, `ape-${artwork}.webp`, 480)
await write(base, `ape-${artwork}@2x.webp`, 960)
await write(base, `ape-${artwork}-thumb.webp`, 160, 80)
await write(base, `ape-${artwork}-thumb@2x.webp`, 320, 80)
for (const [name, [x, y, w]] of Object.entries(crops)) {
  const crop = await sharp(base)
    .extract({ left: Math.round(x * size), top: Math.round(y * size), width: Math.round(w * size), height: Math.round(w * size) })
    .toBuffer()
  await write(crop, `ape-${artwork}-${name}.webp`, 480)
  await write(crop, `ape-${artwork}-${name}@2x.webp`, 960)
}
console.log(`built ${artwork} from ${meta.width}x${meta.height} (inset ${inset}px)`)
