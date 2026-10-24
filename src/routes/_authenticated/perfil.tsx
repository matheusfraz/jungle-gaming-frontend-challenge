import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { AlertTriangle, Download, Heart, LineChart, LogOut, MapPin, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { announce } from '@/components/feedback/announce'
import { useLogout } from '@/features/auth/session'

const items = [
  { label: 'Dados do perfil', icon: User, to: '/perfil' as const, exact: true },
  { label: 'Carteiras', icon: MapPin, to: '/perfil/carteiras' as const },
  { label: 'Atividade', icon: ShoppingCart, section: 'atividade' },
  { label: 'Lista de interesse', icon: Heart, to: '/perfil/favoritos' as const },
  { label: 'Ofertas', icon: LineChart, section: 'ofertas' },
  { label: 'Arquivos baixados', icon: Download, section: 'arquivos' },
  { label: 'Suporte', icon: AlertTriangle, section: 'suporte' },
]

function ProfileLayout() {
  const { pathname } = useLocation()
  const logout = useLogout()

  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-10">
      <nav aria-labelledby="profile-nav-title" className="self-start bg-card pb-2">
        <h1 id="profile-nav-title" className="px-4 pt-5 pb-3 text-lg font-bold">
          Meu perfil
        </h1>
        <ul className="scrollbar-none flex overflow-x-auto lg:flex-col">
          {items.map((item) => {
            const href = item.to ?? `/perfil/${item.section}`
            const active = item.exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href)
            const Icon = item.icon
            const className = cn(
              'relative flex items-center gap-3 whitespace-nowrap px-5 py-3 text-[15px] text-muted-foreground transition-colors hover:text-primary',
              active && 'bg-secondary/40 text-primary before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-primary',
            )
            return (
              <li key={item.label}>
                {item.to ? (
                  <Link to={item.to} className={className} aria-current={active ? 'page' : undefined}>
                    <Icon className="size-5" aria-hidden />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    to="/perfil/$section"
                    params={{ section: item.section! }}
                    className={className}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.label}
                    <span className="rounded-full border border-border px-1.5 text-[10px] text-subtle">em breve</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        <div className="mt-1 border-t border-border">
          <button
            type="button"
            onClick={() => logout.mutate(undefined, { onSettled: () => announce('Você saiu da sua conta.') })}
            disabled={logout.isPending}
            className="flex w-full items-center gap-3 px-5 py-3 text-[15px] font-bold text-muted-foreground hover:text-primary"
          >
            <LogOut className="size-5" aria-hidden />
            Sair
          </button>
        </div>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/perfil')({
  component: ProfileLayout,
})
