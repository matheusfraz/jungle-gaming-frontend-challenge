import Decimal from 'decimal.js'
import { moneySchema, type Money } from '@/contracts/common'

/**
 * All ETH math goes through decimal.js so values never touch binary floats.
 * Inputs and outputs are decimal strings, exactly as they travel in the API.
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

const toDecimal = (value: Money) => new Decimal(moneySchema.parse(value))

export function addMoney(left: Money, right: Money): Money {
  return toDecimal(left).plus(toDecimal(right)).toFixed()
}

export function subtractMoney(left: Money, right: Money): Money {
  return toDecimal(left).minus(toDecimal(right)).toFixed()
}

export function multiplyMoney(amount: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) throw new Error('Quantities must be integers.')
  return toDecimal(amount).times(quantity).toFixed()
}

export function sumMoney(values: Money[]): Money {
  return values.reduce<Money>((total, value) => addMoney(total, value), '0')
}

export function percentOf(amount: Money, percent: number): Money {
  return toDecimal(amount).times(percent).dividedBy(100).toDecimalPlaces(6).toFixed()
}

export function compareMoney(left: Money, right: Money): number {
  return toDecimal(left).comparedTo(toDecimal(right))
}

export function isZero(value: Money): boolean {
  return toDecimal(value).isZero()
}

/** "1.19 ETH", "0.016 ETH", "26.846 ETH" — at least 2 and at most 6 decimals. */
export function formatEth(amount: Money, { suffix = true }: { suffix?: boolean } = {}): string {
  const value = toDecimal(amount)
  const fixed = value.toFixed(Math.max(2, Math.min(6, value.decimalPlaces())))
  return suffix ? `${fixed} ETH` : fixed
}
