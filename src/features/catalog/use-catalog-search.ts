import { useNavigate } from '@tanstack/react-router'
import type { SetCatalogSearch } from './components/catalog-section'
import type { CatalogSearch } from './search'

/** Writes catalog state to the URL (push), so refresh and back/forward restore it. */
export function useSetCatalogSearch(to: '/' | '/mercado'): SetCatalogSearch {
  const navigate = useNavigate()
  return (patch, options) => {
    void navigate({
      to,
      search: (prev: CatalogSearch) => ({
        ...prev,
        ...patch,
        ...(options?.resetPage ? { page: undefined } : {}),
      }),
      resetScroll: false,
    })
  }
}
