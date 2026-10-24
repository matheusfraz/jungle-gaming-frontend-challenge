import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/components/checkout-page'

export const Route = createFileRoute('/_authenticated/pagamento')({
  component: CheckoutPage,
})
