import { z } from 'zod'
import { safeRedirect } from './use-session-watcher'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined).transform(safeRedirect),
  reason: z.enum(['expired']).optional().catch(undefined),
})
