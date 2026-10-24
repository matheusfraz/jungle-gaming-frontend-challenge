import { X } from 'lucide-react'
import { InlineAlert } from '@/components/common/states'
import { cartNotices, useCartNotices } from '../notices'

/** Realtime price/availability changes for items in the cart. */
export function CartNotices() {
  const notices = useCartNotices()
  if (!notices.length) return null
  return (
    <div className="flex flex-col gap-2" data-testid="cart-notices">
      {notices.map((notice) => (
        <InlineAlert
          key={notice.id}
          tone="warning"
          action={
            <button
              type="button"
              onClick={() => cartNotices.dismiss(notice.id)}
              className="inline-flex size-6 items-center justify-center rounded-xs hover:text-primary"
              aria-label="Dispensar aviso"
            >
              <X className="size-4" aria-hidden />
            </button>
          }
        >
          {notice.message}
        </InlineAlert>
      ))}
    </div>
  )
}
