import type { CatalogSearch } from '../search'
import { CatalogSection, type SetCatalogSearch } from './catalog-section'
import { HomeJournal, HomePromos } from './home-editorial'
import { HomeHero } from './home-hero'

export function HomeView({ search, onSearch }: { search: CatalogSearch; onSearch: SetCatalogSearch }) {
  return (
    <>
      <HomeHero />
      <CatalogSection search={search} setSearch={onSearch} showFeatured />
      <HomePromos />
      <HomeJournal />
    </>
  )
}
