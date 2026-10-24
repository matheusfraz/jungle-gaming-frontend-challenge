import { Fragment } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; to?: LinkProps['to'] }[]
  className?: string
}) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('text-sm font-bold tracking-wide', className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={item.label}>
              <li>
                {item.to && !last ? (
                  <Link to={item.to} className="hover:text-primary">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>{item.label}</span>
                )}
              </li>
              {!last ? (
                <li aria-hidden className="text-subtle">
                  /
                </li>
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
