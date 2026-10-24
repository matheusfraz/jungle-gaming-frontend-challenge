import { cn } from '@/lib/utils'

/** "METAMASK · WALLETCONNECT · COINBASE" pill from the footer and payment screen. */
export function WalletBadges({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-sm border border-primary/50 bg-secondary px-3 py-1.5 text-[9px] font-bold tracking-wider text-primary',
        className,
      )}
    >
      METAMASK <span aria-hidden>·</span> WALLETCONNECT <span aria-hidden>·</span> COINBASE
    </span>
  )
}
