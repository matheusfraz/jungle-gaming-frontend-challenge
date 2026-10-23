import { z } from 'zod'

const envSchema = z.object({
  VITE_ENABLE_MOCKS: z.stringbool().default(false),
  VITE_API_URL: z.string().trim().min(1).default('/api'),
})

const parsedEnv = envSchema.safeParse(import.meta.env)

if (!parsedEnv.success) {
  throw new Error(`Invalid application environment: ${z.prettifyError(parsedEnv.error)}`)
}

export const env = {
  enableMocks: parsedEnv.data.VITE_ENABLE_MOCKS,
  apiUrl: parsedEnv.data.VITE_API_URL,
}
