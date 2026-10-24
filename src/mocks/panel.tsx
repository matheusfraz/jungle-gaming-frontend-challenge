import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import type { Cart } from '@/contracts/commerce'
import { addMoney } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { mockControl } from './control'
import { scenarioIds, scenarios, type ScenarioId } from './scenarios'

/**
 * Demo/QA panel (only bundled when mocks are enabled). It drives the mock
 * *server*: effects reach the app through REST responses and Socket.IO events.
 */
export default function MockPanel() {
  const queryClient = useQueryClient()
  const [scenario, setScenario] = useState<ScenarioId>(mockControl.getScenario())
  const [log, setLog] = useState<string>('')

  const cartNft = () => {
    const carts = queryClient.getQueriesData<Cart>({ queryKey: ['cart'] })
    const line = carts.flatMap(([, cart]) => cart?.items ?? [])[0]
    return line ? { nftId: line.nftId, editionId: line.editionId } : { nftId: 'emerald-ape-042', editionId: '1-50' as const }
  }

  const run = (label: string, action: () => unknown) => {
    try {
      const result = action()
      setLog(`${label}: ${result ? JSON.stringify(result) : 'ok'}`)
    } catch (error) {
      setLog(`${label}: ${(error as Error).message}`)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed top-[42%] left-0 z-40 inline-flex items-center gap-2 rounded-r-full border border-l-0 border-primary bg-background/95 px-2 py-2 text-xs font-bold text-primary shadow-lg md:top-auto md:bottom-4 md:left-4 md:rounded-full md:border-l md:px-3"
          data-testid="mock-panel-trigger"
        >
          <FlaskConical className="size-4" aria-hidden />
          <span className="max-md:sr-only">Mocks · {scenarios[scenario].label}</span>
          <span className="sr-only"> — abrir painel de cenários</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[92vw] max-w-md overflow-y-auto p-5">
        <SheetHeader className="p-0">
          <SheetTitle>Painel de mocks (MSW)</SheetTitle>
          <SheetDescription>
            Controla o backend simulado. Mudanças chegam ao app via REST e Socket.IO.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="mock-scenario" className="text-sm font-bold">
            Cenário
          </label>
          <select
            id="mock-scenario"
            value={scenario}
            onChange={(event) => {
              const next = event.target.value as ScenarioId
              mockControl.setScenario(next)
              setScenario(next)
              setLog(`Cenário: ${scenarios[next].label}`)
            }}
            className="h-10 rounded-sm border border-input bg-background px-2 text-sm"
          >
            {scenarioIds.map((id) => (
              <option key={id} value={id}>
                {scenarios[id].label}
              </option>
            ))}
          </select>
          <p className="text-xs text-subtle">{scenarios[scenario].description}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              mockControl.reset(scenario)
              window.location.assign('/')
            }}
          >
            Resetar dados e recarregar
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">Eventos em tempo real</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              run('Preço +0,10 ETH', () => {
                const { nftId } = cartNft()
                const current = mockControl.getNft(nftId)
                return mockControl.updateNft(nftId, { priceEth: addMoney(current?.priceEth ?? '1', '0.1') })
              })
            }
          >
            Aumentar preço do 1º item do carrinho
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              run('Esgotar edição', () => {
                const { nftId, editionId } = cartNft()
                return mockControl.updateNft(nftId, { editions: [{ id: editionId, available: 0 }] })
              })
            }
          >
            Esgotar edição do 1º item do carrinho
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('Evento duplicado', () => mockControl.replayLastEvent()?.id)}>
            Reenviar último evento (duplicado)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('Evento antigo', () => mockControl.emitStaleNftEvent(cartNft().nftId)?.id)}>
            Enviar evento antigo (versão menor)
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('Socket derrubado por 5 s', () => mockControl.dropSockets(5000))}>
            Derrubar conexão por 5 s
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">Sessão e pedidos</h3>
          <Button size="sm" variant="secondary" onClick={() => run('Sessões expiradas', () => mockControl.expireSessions())}>
            Expirar sessão atual
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('Pedidos liquidados', () => mockControl.settleOrders())}>
            Liquidar pedidos pendentes agora
          </Button>
        </div>

        <div className="rounded-sm bg-background p-3 text-xs">
          <p className="font-bold">Credenciais fictícias</p>
          <p>ana@kurio.test · Kurio2026</p>
          <p>bruno@kurio.test · Kurio2026</p>
          <p className="mt-1 text-subtle">Ou crie uma conta com qualquer e-mail válido.</p>
          <p className="mt-2 font-bold">Cupons</p>
          <p>KURIO10, GENESIS25 (válidos) · VERAO2025 (expirado)</p>
        </div>
        {log ? (
          <p role="status" className="text-xs break-words text-subtle">
            {log}
          </p>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
