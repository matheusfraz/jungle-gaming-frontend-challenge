import { editionLabels, type Edition, type EditionId } from '@/contracts/nft'
import { cn } from '@/lib/utils'

export function EditionPicker({
  editions,
  selected,
  onSelect,
  message,
  warning,
}: {
  editions: Edition[]
  selected: EditionId
  onSelect: (edition: EditionId) => void
  message: string
  warning: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((item) => {
          const isSelected = item.id === selected
          const soldOut = item.available === 0
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={soldOut}
              aria-label={`Edição ${item.label}${soldOut ? ' (esgotada)' : ''}`}
              onClick={() => {
                if (!soldOut) onSelect(item.id)
              }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs tracking-wide transition-colors',
                isSelected ? 'border-2 border-primary text-foreground' : 'border-border text-muted-foreground',
                soldOut ? 'cursor-not-allowed line-through opacity-50' : 'hover:border-primary',
              )}
            >
              {editionLabels[item.id]}
            </button>
          )
        })}
      </div>
      <p className={cn('text-xs', warning ? 'text-destructive' : 'text-subtle')} aria-live="polite">
        {message}
      </p>
    </fieldset>
  )
}
