import { useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Search, ShoppingCart, User, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { announce } from '@/components/feedback/announce'
import { useLogout, useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/hooks'
import { SearchDialog } from './search-dialog'

const navItems = [
  { to: '/', label: 'Início', match: (path: string) => path === '/' },
  {
    to: '/mercado',
    label: 'Mercado',
    match: (path: string) => ['/mercado', '/nft', '/carrinho', '/pagamento', '/pedido'].some((prefix) => path.startsWith(prefix)),
  },
  { to: '/criadores', label: 'Criadores', match: (path: string) => path.startsWith('/criadores') },
  { to: '/aprenda', label: 'Aprenda', match: (path: string) => path.startsWith('/aprenda') },
] as const

export function Logo() {
  return (
    <Link to="/" className="text-sm font-extrabold tracking-[0.25em]" aria-label="Kurio — página inicial">
      KURIO
    </Link>
  )
}

function UserMenu() {
  const { user } = useSession()
  const logout = useLogout()
  if (!user) return null
  const initials = user.displayName.slice(0, 1).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-sm border border-primary px-2 py-1.5 text-sm text-primary hover:bg-primary/10"
          aria-label={`Menu da conta de ${user.displayName}`}
          data-testid="user-menu"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </span>
          )}
          <span className="hidden max-w-[10ch] truncate sm:inline">{user.displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <User aria-hidden /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">
            <Wallet aria-hidden /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/favoritos">
            <Heart aria-hidden /> Lista de interesse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            logout.mutate(undefined, {
              onSettled: () => announce('Você saiu da sua conta.'),
            })
          }
        >
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  const { pathname, href } = useLocation()
  const { user, isPending } = useSession()
  const { count } = useCart()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)

  const loginLink = (
    <Link
      to="/entrar"
      search={{ redirect: pathname.startsWith('/entrar') || pathname.startsWith('/cadastro') ? undefined : href }}
      className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
    >
      <LogIn className="size-4" aria-hidden />
      Entrar
    </Link>
  )

  return (
    <header className="container-page">
      <div className="flex h-[72px] items-center justify-between gap-4 border-b border-border">
        <Logo />

        <nav aria-label="Principal" className="h-full">
          <ul className="flex h-full items-center gap-10">
            {navItems.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.to} className="h-full">
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex h-full items-center text-sm tracking-wide transition-colors hover:text-primary',
                      active && 'font-bold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            ref={searchButton}
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-sm hover:text-primary"
            aria-label="Buscar NFTs"
          >
            <Search className="size-5" aria-hidden />
          </button>
          <Link
            to="/carrinho"
            className="relative inline-flex size-9 items-center justify-center rounded-sm hover:text-primary"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            data-testid="header-cart"
          >
            <ShoppingCart className="size-5" aria-hidden />
            <span
              aria-hidden
              className="absolute top-0.5 right-0 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            >
              {count}
            </span>
          </Link>
          <div>{isPending ? <span className="skeleton block h-9 w-[86px]" aria-hidden /> : user ? <UserMenu /> : loginLink}</div>

        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} returnFocus={searchButton} />
    </header>
  )
}
