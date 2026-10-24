import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Round orange "−  n  +" control from the Figma, as an accessible spin group. */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled,
  size = 'md',
  tone = 'primary',
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'md'
  /** `muted`: dark round buttons (mobile cart frame). */
  tone?: 'primary' | 'muted'
}) {
  const button = cn(
    'inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
    tone === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
    size === 'md' ? 'size-7' : tone === 'muted' ? 'size-8' : 'size-6',
  )
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-3">
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label={`Diminuir ${label.toLowerCase()}`}
      >
        <Minus className="size-4" strokeWidth={3} aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-[1.5ch] text-center text-base tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Aumentar ${label.toLowerCase()}`}
      >
        <Plus className="size-4" strokeWidth={3} aria-hidden />
      </button>
    </div>
  )
}
