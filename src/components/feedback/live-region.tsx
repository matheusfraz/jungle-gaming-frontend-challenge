import { useSyncExternalStore } from 'react'
import { announcerState, subscribeAnnouncer } from './announce'

export function LiveRegion() {
  const snapshot = useSyncExternalStore(subscribeAnnouncer, () => announcerState, () => announcerState)
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {snapshot.polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {snapshot.assertive}
      </div>
    </>
  )
}
