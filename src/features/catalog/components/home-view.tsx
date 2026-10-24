import { useState } from 'react'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { activeFilterCount, type CatalogSearch } from '../search'
import { CatalogSection, type SetCatalogSearch } from './catalog-section'
import { HomeJournal, HomePromos } from './home-editorial'
import { HomeHero } from './home-hero'
import { MobileHero, MobileSearchRow } from './mobile-home'

export function HomeView({ search, onSearch }: { search: CatalogSearch; onSearch: SetCatalogSearch }) {
  const isDesktop = useIsDesktop()
  const [filtersOpen, setFiltersOpen] = useState(false)
  return (
    <>
      {isDesktop ? (
        <HomeHero />
      ) : (
        <>
          <MobileSearchRow query={search.q} activeFilters={activeFilterCount(search)} onOpenFilters={() => setFiltersOpen(true)} />
          <MobileHero />
        </>
      )}
      <CatalogSection
        search={search}
        setSearch={onSearch}
        showFeatured
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />
      <HomePromos />
      <HomeJournal />
    </>
  )
}
