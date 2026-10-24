import { useState, type FormEvent, type RefObject } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** Global NFT search (desktop header and mobile bottom bar). */
export function SearchDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocus: RefObject<HTMLButtonElement | null>
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onOpenChange(false)
    void navigate({ to: '/mercado', search: { q: value.trim() || undefined } })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-24 translate-y-0 sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          // Opened from a plain button (not a DialogTrigger): give focus back to it.
          event.preventDefault()
          returnFocus.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Busque por nome, coleção ou ID do token.</DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={submit} className="flex gap-2">
          <label htmlFor="global-search" className="sr-only">
            Termo de busca
          </label>
          <Input
            id="global-search"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ex.: Golden, #0042, Kurio Apes"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
