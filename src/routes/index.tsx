import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const catalogSearchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).optional(),
  page: z.coerce.number().int().positive().catch(1),
})

function HomePage() {
  return (
    <main className="page-shell">
      <h1>Jungle Gaming</h1>
      <p>O catálogo e os demais fluxos serão adicionados nas features do projeto.</p>
    </main>
  )
}

export const Route = createFileRoute('/')({
  validateSearch: (search) => catalogSearchSchema.parse(search),
  component: HomePage,
})
