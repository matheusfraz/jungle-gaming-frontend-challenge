// Builds favicon.ico (16/32/48) and apple-touch-icon.png from public/favicon.svg.
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync('public/favicon.svg')
const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()))

// ICO container with embedded PNGs.
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = sizes.map((size, index) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size, 0)
  entry.writeUInt8(size, 1)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngs[index].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += pngs[index].length
  return entry
})
writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries, ...pngs]))

// Apple touch icon: full-bleed square (iOS rounds the corners itself).
const square = svg.toString().replace('rx="14" ', '')
await sharp(Buffer.from(square), { density: 384 }).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('ok')
