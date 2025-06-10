
import { useEffect, useState } from 'react'

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      is_premium?: boolean
    }
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    link_color: string
    button_color: string
    button_text_color: string
    secondary_bg_color: string
    hint_color: string
    bg_color: string
    text_color: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    readonly isProgressVisible: boolean
    setText(text: string): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
    setParams(params: {
      text?: string
      color?: string
      text_color?: string
      is_active?: boolean
      is_visible?: boolean
    }): void
  }
  ready(): void
  expand(): void
  close(): void
  sendData(data: string): void
}

interface TelegramHook {
  tg: TelegramWebApp | null
  user: TelegramWebApp['initDataUnsafe']['user'] | null
  getReferralCode: () => string | null
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function useTelegram(): TelegramHook {
  const tg = window.Telegram?.WebApp || null

  const getReferralCode = () => {
    // First check start_param from Telegram WebApp
    const startParam = tg?.initDataUnsafe?.start_param
    console.log('Telegram start_param:', startParam)
    
    if (startParam) {
      // Handle different referral formats
      if (startParam.startsWith('r_')) {
        const code = startParam.substring(2) // Remove 'r_' prefix
        console.log('Extracted referral code from start_param:', code)
        return code
      } else if (startParam.startsWith('ref_')) {
        const code = startParam.substring(4) // Remove 'ref_' prefix
        console.log('Extracted referral code from start_param:', code)
        return code
      } else {
        // Assume it's a direct referral code
        console.log('Direct referral code from start_param:', startParam)
        return startParam
      }
    }

    // Fallback: Check URL parameters (for web browsers)
    const urlParams = new URLSearchParams(window.location.search)
    const refFromUrl = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('startapp')
    
    if (refFromUrl) {
      if (refFromUrl.startsWith('r_')) {
        const code = refFromUrl.substring(2)
        console.log('Extracted referral code from URL:', code)
        return code
      } else if (refFromUrl.startsWith('ref_')) {
        const code = refFromUrl.substring(4)
        console.log('Extracted referral code from URL:', code)
        return code
      } else {
        console.log('Direct referral code from URL:', refFromUrl)
        return refFromUrl
      }
    }

    // Check hash parameters as well
    const hash = window.location.hash
    if (hash.includes('tgWebAppStartParam=')) {
      const match = hash.match(/tgWebAppStartParam=([^&]+)/)
      if (match) {
        let param = match[1]
        if (param.startsWith('r_')) {
          param = param.substring(2)
        } else if (param.startsWith('ref_')) {
          param = param.substring(4)
        }
        console.log('Extracted referral code from hash:', param)
        return param
      }
    }

    console.log('No referral code found')
    return null
  }

  return {
    tg,
    user: tg?.initDataUnsafe?.user || null,
    getReferralCode
  }
}
