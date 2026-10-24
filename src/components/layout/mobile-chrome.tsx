import { useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart, Home, ScanLine, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/hooks'
import { SearchDialog } from './search-dialog'

/** Round back button + centered title, as in the mobile frames. */
export function MobileTopBar({
  title,
  fallback = '/',
  right,
  className,
  buttonClassName,
}: {
  title?: string
  fallback?: string
  right?: ReactNode
  className?: string
  /** Classes for the round back button (e.g. a lighter fill on the detail backdrop). */
  buttonClassName?: string
}) {
  const router = useRouter()
  const back = () => {
    if (window.history.length > 1) router.history.back()
    else void router.navigate({ to: fallback })
  }
  return (
    <div className={cn('grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 px-4 pt-4 pb-2 md:hidden', className)}>
      <button
        type="button"
        onClick={back}
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-full bg-card text-primary hover:bg-secondary',
          buttonClassName,
        )}
        aria-label="Voltar"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      {title ? <h1 className="truncate text-center text-base font-bold tracking-wide">{title}</h1> : <span />}
      <div className="flex justify-end">{right}</div>
    </div>
  )
}

/** Brand bar for mobile screens that the frames do not cover (profile, order, etc.). */
export function MobileBrandBar() {
  return (
    <div className="flex h-14 items-center justify-center border-b border-border px-4 md:hidden">
      <Link to="/" className="text-base font-extrabold tracking-[0.3em]" aria-label="Kurio — página inicial">
        KURIO
      </Link>
    </div>
  )
}

/** Bottom tab bar from the mobile "Início" frame. */
export function MobileTabBar() {
  const { pathname } = useLocation()
  const { user } = useSession()
  const { count } = useCart()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)

  const item = (active: boolean) =>
    cn(
      'relative inline-flex size-11 items-center justify-center rounded-full transition-colors',
      active ? 'text-primary' : 'text-foreground/85 hover:text-primary',
    )

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.35)] md:hidden"
        data-testid="mobile-tab-bar"
      >
        <ul className="grid h-[68px] grid-cols-5 items-center justify-items-center px-3">
          <li>
            <Link to="/" className={item(pathname === '/')} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
              <Home className={cn('size-6', pathname === '/' && 'fill-current')} aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              to="/perfil/favoritos"
              className={item(pathname.startsWith('/perfil/favoritos'))}
              aria-label="Favoritos"
              aria-current={pathname.startsWith('/perfil/favoritos') ? 'page' : undefined}
            >
              <Heart className="size-6 fill-current" aria-hidden />
            </Link>
          </li>
          <li className="-mt-9">
            <button
              ref={searchButton}
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-[6px] ring-background transition-transform hover:scale-105"
              aria-label="Buscar NFTs"
            >
              <ScanLine className="size-7" aria-hidden />
            </button>
          </li>
          <li>
            <Link
              to="/carrinho"
              className={item(false)}
              aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
              data-testid="header-cart"
            >
              <ShoppingCart className="size-6" aria-hidden />
              {count > 0 ? (
                <span
                  aria-hidden
                  className="absolute top-0.5 right-0 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </li>
          <li>
            <Link
              to={user ? '/perfil' : '/entrar'}
              className={item(pathname.startsWith('/perfil') && !pathname.startsWith('/perfil/favoritos'))}
              aria-label={user ? 'Meu perfil' : 'Entrar'}
            >
              <User className="size-6 fill-current" aria-hidden />
            </Link>
          </li>
        </ul>
      </nav>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} returnFocus={searchButton} />
    </>
  )
}
