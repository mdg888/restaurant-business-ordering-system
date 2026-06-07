import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Returns the GST component of a GST-inclusive price (10% included) */
export function gstAmount(cents: number): number {
  return cents - Math.round(cents / 1.1)
}

/** Returns the ex-GST amount */
export function exGst(cents: number): number {
  return Math.round(cents / 1.1)
}
