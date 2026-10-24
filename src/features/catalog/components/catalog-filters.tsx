import { useId, useState } from 'react'
import type { NftListResponse } from '@/contracts/nft'
import { categoryIds, categoryLabels, networkIds, networkLabels, type CategoryId, type NetworkId } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { CatalogSearch } from '../search'

type Facets = NftListResponse['facets'] | undefined

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

const formatBr = (value: number) => value.toFixed(2).replace('.', ',')

function FacetList<T extends string>({
  title,
  ids,
  labels,
  selected,
  counts,
  onToggle,
  emphasize,
}: {
  title: string
  ids: readonly T[]
  labels: Record<T, string>
  selected: T[] | undefined
  counts: Map<string, number>
  onToggle: (id: T) => void
  emphasize?: boolean
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-bold">
        {title}
      </h2>
      <ul className="flex flex-col gap-1">
        {ids.map((id) => {
          const active = selected?.includes(id) ?? false
          const count = counts.get(id)
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onToggle(id)}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center justify-between rounded-xs px-3 py-1.5 text-left text-sm transition-colors hover:text-primary',
                  active ? 'bg-secondary font-bold text-primary' : emphasize ? 'text-muted-foreground' : 'text-subtle',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex size-3 items-center justify-center rounded-[2px] border',
                      active ? 'border-primary bg-primary' : 'border-border',
                    )}
                  />
                  {labels[id]}
                </span>
                <span className="tabular-nums">({count ?? '–'})</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PriceRange({
  rangeMin,
  rangeMax,
  initial,
  onApply,
}: {
  rangeMin: number
  rangeMax: number
  initial: [number, number]
  onApply: (min: number | undefined, max: number | undefined) => void
}) {
  const [range, setRange] = useState<[number, number]>(initial)
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-base font-bold">
        Faixa de preço
      </h2>
      <Slider
        min={rangeMin}
        max={rangeMax}
        step={0.01}
        value={range}
        minStepsBetweenThumbs={1}
        onValueChange={(value) => setRange([value[0], value[1]])}
        thumbLabels={['Preço mínimo em ETH', 'Preço máximo em ETH']}
        className="px-1"
      />
      <p className="text-sm" aria-live="polite">
        Preço: {formatBr(range[0])} - {formatBr(range[1])} ETH
      </p>
      <div>
        <Button
          size="sm"
          onClick={() =>
            onApply(
              range[0] <= rangeMin ? undefined : Number(range[0].toFixed(2)),
              range[1] >= rangeMax ? undefined : Number(range[1].toFixed(2)),
            )
          }
        >
          Aplicar
        </Button>
      </div>
    </section>
  )
}

export function CatalogFilters({
  search,
  facets,
  onChange,
  className,
}: {
  search: CatalogSearch
  facets: Facets
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}) {
  const rangeMin = facets ? Number(facets.priceRange.min) : 0
  const rangeMax = facets ? Math.max(Number(facets.priceRange.max), rangeMin + 0.01) : 12.3
  const categoryCounts = new Map(facets?.categories.map((facet) => [facet.id, facet.count]))
  const networkCounts = new Map(facets?.networks.map((facet) => [facet.id, facet.count]))

  return (
    <div className={cn('flex flex-col gap-8 bg-card p-5', className)} data-testid="catalog-filters">
      <FacetList<CategoryId>
        title="Coleções"
        ids={categoryIds}
        labels={categoryLabels}
        selected={search.categories}
        counts={categoryCounts}
        emphasize
        onToggle={(id) => onChange({ categories: toggle(search.categories, id) })}
      />

      {/* Keyed by the URL values: history navigation or "clear filters" resets the slider. */}
      <PriceRange
        key={`${search.min}-${search.max}-${rangeMin}-${rangeMax}`}
        rangeMin={rangeMin}
        rangeMax={rangeMax}
        initial={[search.min ?? rangeMin, search.max ?? rangeMax]}
        onApply={(min, max) => onChange({ min, max })}
      />

      <FacetList<NetworkId>
        title="Rede"
        ids={networkIds}
        labels={networkLabels}
        selected={search.networks}
        counts={networkCounts}
        onToggle={(id) => onChange({ networks: toggle(search.networks, id) })}
      />
    </div>
  )
}
