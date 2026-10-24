import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/orders/components/order-page'

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderPage key={orderId} orderId={orderId} />
}

export const Route = createFileRoute('/_authenticated/pedido/$orderId')({
  component: OrderRoute,
})
