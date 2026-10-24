import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { errorMessage, isApiError } from './http/client'

/**
 * Maps API validation/conflict errors onto form fields. Returns the message
 * to show at form level when the error is not tied to a known field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | undefined {
  if (!isApiError(error)) return errorMessage(error)
  let mapped = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !mapped })
      mapped = true
    }
  }
  return mapped ? undefined : error.message
}
