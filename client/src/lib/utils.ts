import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRemainingCooldown(lastAdWatch: Date | string | null, cooldownSeconds: number): number {
  if (!lastAdWatch) return 0

  const cooldownMs = cooldownSeconds * 1000 // تحويل الثواني إلى ملي ثانية
  const lastAdDate = typeof lastAdWatch === 'string' ? new Date(lastAdWatch) : lastAdWatch
  const timeSinceLastAd = Date.now() - lastAdDate.getTime()

  return Math.max(0, cooldownMs - timeSinceLastAd)
}

export function formatCooldownTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000)

  // عرض الثواني فقط بدون دقائق لأن المدة قصيرة (10 ثواني)
  return `${seconds}s`
}

export function formatPoints(points: number): string {
  return points.toLocaleString()
}

export function formatCurrency(amount: number, currency: 'usd' | 'egp'): string {
  if (currency === 'usd') {
    return `$${(amount / 100).toFixed(2)}`
  } else {
    return `£${(amount / 100).toFixed(0)}`
  }
}

export function generateReferralLink(userId: string | number): string {
  const botUsername = "Eg_Token_bot" // Your actual bot username
  // Ensure userId is converted to number format for consistent referral handling
  const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
  return `https://t.me/${botUsername}?start=${UserId}`
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}