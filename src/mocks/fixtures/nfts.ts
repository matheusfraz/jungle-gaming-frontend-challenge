import type { CategoryId, Edition, NetworkId, Review } from '@/contracts/nft'

/**
 * Deterministic catalog fixture: 40 NFTs, 9 categories, 3 networks and a
 * 0.02–12.30 ETH price range. The first nine items reproduce the Figma grid.
 */

type Artwork = 'emerald' | 'sage' | 'ivory' | 'golden'

export interface NftRecord {
  id: string
  tokenId: string
  name: string
  artwork: Artwork
  priceEth: string
  compareAtEth: string | null
  category: CategoryId
  network: NetworkId
  collection: string
  rare: boolean
  featured: boolean
  listedAt: string
  sales: number
  version: number
  editions: Edition[]
  rating: number
  reviews: Review[]
  creator: string
  royaltyPct: number
  contract: string
}

const artworkAlt: Record<Artwork, string> = {
  emerald:
    'Macaco de pelo castanho com óculos redondos de lentes verdes, jaqueta college verde e colar com pingente de esmeralda.',
  sage: 'Gorila grisalho com chapéu bucket verde-sálvia e moletom lilás, sorrindo de olhos semicerrados.',
  ivory: 'Chimpanzé de pelo preto com brinco dourado, blusa de gola alta verde e blazer creme.',
  golden: 'Macaco de pelo dourado com fones de ouvido verdes e jaqueta creme sobre fundo circular verde-claro.',
}

const artworkAttributes: Record<Artwork, string[]> = {
  emerald: ['Óculos', 'Esmeralda', 'Raro'],
  sage: ['Chapéu bucket', 'Moletom lilás', 'Sereno'],
  ivory: ['Gola alta', 'Brinco dourado', 'Elegante'],
  golden: ['Fones verdes', 'Jaqueta creme', 'Musical'],
}

export function artworkImage(artwork: Artwork, variant?: 'face' | 'outfit' | 'detail' | 'thumb') {
  return `/nfts/ape-${artwork}${variant ? `-${variant}` : ''}.webp`
}

export function artworkAltText(artwork: Artwork, name: string) {
  return `${name}: ${artworkAlt[artwork]}`
}

export function artworkGallery(artwork: Artwork, name: string) {
  return [
    { src: artworkImage(artwork), alt: artworkAltText(artwork, name) },
    { src: artworkImage(artwork, 'face'), alt: `${name}: detalhe do rosto.` },
    { src: artworkImage(artwork, 'outfit'), alt: `${name}: detalhe da roupa.` },
    { src: artworkImage(artwork, 'detail'), alt: `${name}: detalhe dos acessórios.` },
  ]
}

export function artworkAttributeList(artwork: Artwork) {
  return artworkAttributes[artwork]
}

const reviewAuthors = [
  'ana.eth', 'colecionador_br', 'pixelmonk', 'lua.nft', 'satoshi_fan', 'dao_curator',
  'mint_maria', 'block_beto', 'cripto_carla', 'gallery_gus', 'nina.wallet', 'otavio.eth',
  'rare_rita', 'token_tiago', 'vera.art', 'wagner_web3', 'yara.mint', 'zeca.eth', 'iris.dao',
]

const reviewComments = [
  'Arte impecável, a textura do pelo é absurda em alta resolução.',
  'Entrega rápida na carteira e procedência clara. Recomendo.',
  'Um dos melhores drops da Kurio até agora.',
  'Os atributos combinam muito bem com o resto da coleção.',
  'Comprei a edição 1/50 e o acesso exclusivo já foi liberado.',
  'Detalhes incríveis, vale cada ETH.',
  'Ótimo para começar uma coleção de personagens.',
]

function buildReviews(seed: number, count: number): Review[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `rev_${seed}_${index}`,
    author: reviewAuthors[(seed + index) % reviewAuthors.length],
    rating: 4 + ((seed + index) % 2),
    comment: reviewComments[(seed * 3 + index) % reviewComments.length],
    createdAt: new Date(Date.UTC(2026, 8, 20 - index, 12)).toISOString(),
  }))
}

function editionsFor(seed: number, options: { soldOutOneOfOne?: boolean; allSoldOut?: boolean } = {}): Edition[] {
  if (options.allSoldOut) {
    return [
      { id: '1-1', label: '1/1', available: 0, maxPerOrder: 1 },
      { id: '1-10', label: '1/10', available: 0, maxPerOrder: 5 },
      { id: '1-50', label: '1/50', available: 0, maxPerOrder: 10 },
      { id: 'open', label: 'ABERTA', available: 0, maxPerOrder: 20 },
    ]
  }
  return [
    { id: '1-1', label: '1/1', available: options.soldOutOneOfOne || seed % 3 === 0 ? 0 : 1, maxPerOrder: 1 },
    { id: '1-10', label: '1/10', available: seed % 4 === 1 ? 0 : 2 + (seed % 7), maxPerOrder: 5 },
    { id: '1-50', label: '1/50', available: 12 + ((seed * 7) % 30), maxPerOrder: 10 },
    { id: 'open', label: 'ABERTA', available: 500, maxPerOrder: 20 },
  ]
}

interface Seed {
  name: string
  number: string
  artwork: Artwork
  price: string
  compareAt?: string
  category: CategoryId
  network: NetworkId
  rare?: boolean
  featured?: boolean
  sales: number
  allSoldOut?: boolean
}

const figmaSeeds: Seed[] = [
  { name: 'Emerald Ape', number: '042', artwork: 'emerald', price: '1.19', category: 'digital-art', network: 'ethereum', featured: true, sales: 61 },
  { name: 'Sage Nomad', number: '009', artwork: 'sage', price: '1.69', category: 'digital-art', network: 'ethereum', featured: true, sales: 48 },
  { name: 'Neon Vessel', number: '552', artwork: 'ivory', price: '1.99', compareAt: '2.29', category: 'collectibles', network: 'ethereum', rare: true, featured: true, sales: 72 },
  { name: 'Cosmic Bloom', number: '118', artwork: 'sage', price: '1.29', category: 'generative', network: 'polygon', sales: 33 },
  { name: 'Violet Nomad', number: '314', artwork: 'sage', price: '1.39', category: 'photography', network: 'ethereum', sales: 41 },
  { name: 'Ivory Baron', number: '088', artwork: 'ivory', price: '1.79', category: 'digital-art', network: 'solana', sales: 55 },
  { name: 'Golden Beat', number: '207', artwork: 'golden', price: '0.99', category: 'music', network: 'ethereum', sales: 44 },
  { name: 'Golden Frequency', number: '071', artwork: 'golden', price: '0.59', category: 'music', network: 'polygon', sales: 18 },
  { name: 'Golden Signal', number: '160', artwork: 'golden', price: '0.39', category: 'music', network: 'ethereum', sales: 26 },
]

const extraNames: Record<Artwork, string[]> = {
  emerald: ['Jade Rebel', 'Verdant King', 'Emerald Muse', 'Mossy Crown', 'Forest Ace', 'Jungle Echo', 'Canopy Star', 'Green Monarch'],
  sage: ['Sage Drifter', 'Lilac Nomad', 'Bucket Sage', 'Misty Wanderer', 'Lavender Haze', 'Purple Pilgrim', 'Dusk Rover', 'Velvet Hood'],
  ivory: ['Onyx Baron', 'Midnight Vessel', 'Ivory Duke', 'Obsidian Heir', 'Noir Captain', 'Shadow Envoy', 'Ebony Count', 'Silent Baron'],
  golden: ['Golden Groove', 'Amber Pulse', 'Sunset Tempo', 'Honey Bass', 'Brass Rhythm', 'Solar Echo', 'Copper Wave'],
}

const categoriesCycle: CategoryId[] = [
  'digital-art', 'photography', 'music', '3d-art', 'collectibles', 'generative', 'gaming', 'memberships', 'utility',
]

const specialPrices: Record<string, string> = {
  'Green Monarch': '12.30',
  'Obsidian Heir': '8.75',
  'Copper Wave': '0.02',
  'Midnight Vessel': '4.20',
}

function generatedSeeds(): Seed[] {
  const seeds: Seed[] = []
  const artworks: Artwork[] = ['emerald', 'sage', 'ivory', 'golden']
  let index = 0
  for (let round = 0; round < 8; round += 1) {
    for (const artwork of artworks) {
      const name = extraNames[artwork][round]
      if (!name) continue
      const n = index + 10
      const networkPick = n % 5
      seeds.push({
        name,
        number: String(((n * 53) % 900) + 100).padStart(3, '0'),
        artwork,
        price: specialPrices[name] ?? (((n * 37) % 250) / 100 + 0.2).toFixed(2),
        compareAt: n % 9 === 0 ? (((n * 37) % 250) / 100 + 0.6).toFixed(2) : undefined,
        category: categoriesCycle[n % categoriesCycle.length],
        network: networkPick <= 2 ? 'ethereum' : networkPick === 3 ? 'polygon' : 'solana',
        rare: n % 7 === 0,
        sales: (n * 13) % 80,
        allSoldOut: name === 'Silent Baron',
      })
      index += 1
    }
  }
  return seeds
}

function slugify(name: string, number: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${number}`
}

export function buildNftFixtures(): NftRecord[] {
  const all = [...figmaSeeds, ...generatedSeeds()]
  return all.map((seed, index) => {
    const listedDay = new Date(Date.UTC(2026, 9, 20 - index, 15))
    const reviewsCount = index === 0 ? 19 : 3 + (index % 9)
    return {
      id: slugify(seed.name, seed.number),
      tokenId: `#${seed.number.padStart(4, '0')}`,
      name: `${seed.name} #${seed.number}`,
      artwork: seed.artwork,
      priceEth: seed.price,
      compareAtEth: seed.compareAt ?? null,
      category: seed.category,
      network: seed.network,
      collection: 'Kurio Apes',
      rare: seed.rare ?? false,
      featured: seed.featured ?? false,
      listedAt: listedDay.toISOString(),
      sales: seed.sales,
      version: 1,
      editions: editionsFor(index, { soldOutOneOfOne: index === 0, allSoldOut: seed.allSoldOut }),
      rating: index === 0 ? 5 : 4 + (index % 2) * 0.5,
      reviews: buildReviews(index, reviewsCount),
      creator: index % 2 === 0 ? 'Nova Sato' : 'Rafa Lume',
      royaltyPct: 5,
      contract: `0x7A${(42 + index).toString(16).toUpperCase().padStart(2, '0')}...19E8`,
    }
  })
}

/** Listings newer than this date appear under "Novos lançamentos". */
export const NEW_RELEASE_CUTOFF = '2026-10-08T00:00:00.000Z'
/** Items with at least this many sales appear under "Em alta". */
export const TRENDING_MIN_SALES = 45
