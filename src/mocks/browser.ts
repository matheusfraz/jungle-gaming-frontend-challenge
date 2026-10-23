import { setupWorker } from 'msw/browser'
import { healthHandlers } from './handlers/health'

export const worker = setupWorker(...healthHandlers)
