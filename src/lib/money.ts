import Decimal from 'decimal.js'
import { moneySchema, type Money } from '../contracts/common'

export function addMoney(left: Money, right: Money): Money {
  return new Decimal(moneySchema.parse(left))
    .plus(moneySchema.parse(right))
    .toFixed()
}

export function formatMoney(
  amount: Money,
  currency = 'BRL',
  locale = 'pt-BR',
): string {
  const value = new Decimal(moneySchema.parse(amount))

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value.toNumber())
}
