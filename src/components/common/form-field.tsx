import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

/**
 * Label + control + hint + error, wired with ids so screen readers announce
 * the label, the hint and the error message of each field.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  className,
  hideLabel,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  hideLabel?: boolean
  children: (props: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className={cn('text-[15px] font-normal tracking-wide text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required ? (
          <span aria-hidden className="text-primary text-lg leading-none">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (obrigatório)</span> : null}
      </Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1 text-xs text-destructive" role="alert">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  )
}
