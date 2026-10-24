import { useEffect } from 'react'

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    document.title = `${title} · Kurio`
  }, [title])
}
