import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { nftListQueryOptions } from '../api'
import { PriceTag } from './nft-card'

/** "NFT EM DESTAQUE · OFERTA LIMITADA" card under the filters. */
export function FeaturedNft() {
  const { data, isPending, isError } = useQuery(nftListQueryOptions({ featured: true, pageSize: 3, sort: 'recent' }))
  const nft = data?.items[1] ?? data?.items[0]

  if (isError) return null

  return (
    <section aria-labelledby="featured-title" className="flex flex-col bg-card">
      <div className="px-3 pt-5 pb-3">
        <h2 id="featured-title" className="text-lg font-bold tracking-wider text-primary">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-1 text-center text-base font-bold tracking-wider">OFERTA LIMITADA</p>
      </div>
      {isPending || !nft ? (
        <div className="skeleton aspect-[4/5] w-full rounded-2xl" aria-hidden />
      ) : (
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="group relative block overflow-hidden rounded-2xl focus-visible:outline-2"
        >
          <img
            src={nft.image}
            alt={nft.imageAlt}
            width={480}
            height={480}
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
            <span className="text-sm font-bold">{nft.name}</span>
            <PriceTag price={nft.priceEth} compareAt={nft.compareAtEth} />
          </span>
        </Link>
      )}
    </section>
  )
}
