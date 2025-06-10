import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { User } from "@shared/schema"
import { TopBar } from "@/components/top-bar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { EarnSection } from "@/components/earn-section"
import { QuestsSection } from "@/components/quests-section"
import { FriendsSection } from "@/components/friends-section"
import { WalletSection } from "@/components/wallet-section"
import InvestmentPage from "@/pages/investment"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/queryClient"
import { useLocation } from "wouter"
import { useUser } from "@/hooks/use-user";
import { useTelegram } from "@/hooks/use-telegram"

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        MainButton: {
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
        };
        close: () => void;
      };
    };
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("earn")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { tg, getReferralCode } = useTelegram()

  const createUserMutation = useMutation({
    mutationFn: (userData: any) => apiRequest("POST", "/api/auth/telegram", userData),
    onSuccess: (data: { user: User }) => {
      console.log("User created successfully:", data)
      setCurrentUser(data.user)
      setIsLoading(false)
      queryClient.invalidateQueries({ queryKey: ["/api/user"] })
    },
    onError: (error: any) => {
      console.error("Authentication error:", error)
      setIsLoading(false)
    }
  })

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      const telegramData = tg.initDataUnsafe
      if (telegramData.user) {
        // Authenticate user with backend
        const referralCode = telegramData.start_param
        const tgUser = telegramData.user
        const userData = {
          telegramId: tgUser.id,
          username: tgUser.username || "Unknown",
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || null,
          referralCode: referralCode || null
        }
        createUserMutation.mutate(userData)
      } else {
        console.log("No Telegram user data available")
        setIsLoading(false)
      }
    } else {
      // For development/testing outside Telegram - create demo user
      console.log("Running outside Telegram, creating demo user")
      createUserMutation.mutate({
        telegramId: 123456789,
        username: "demo_user",
        firstName: "Demo",
        lastName: "User",
        referralCode: null
      })
    }
  }, [])

  // Keep user data fresh with real-time updates
  const { data: userData } = useUser(currentUser);


  // This second useEffect is redundant and has errors, removing it
  // The authentication is already handled in the first useEffect

  const user = userData?.user || currentUser

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088CC] mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Setting up your account...</p>
          <p className="text-sm text-gray-500">Please wait while we connect to Telegram</p>

          {/* Add timeout fallback */}
          <button 
            onClick={() => {
              console.log("Force reload attempt");
              setIsLoading(false);
              window.location.reload();
            }}
            className="mt-6 text-sm text-[#0088CC] hover:underline"
          >
            Taking too long? Tap to retry
          </button>
        </div>
      </div>
    )
  }

  if (!user && !window.Telegram?.WebApp) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-[#0088CC] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.102.023-.174.04-.25.04-.844 0-1.52-.773-1.52-1.726 0-.953.676-1.726 1.52-1.726.076 0 .148.017.25.04.03.01.095.03.143.055-.71-1.155-1.95-1.943-3.37-1.943-2.175 0-3.93 1.786-3.93 3.99 0 2.204 1.755 3.99 3.93 3.99 1.42 0 2.66-.788 3.37-1.943-.048.025-.113.045-.143.055z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Open in Telegram</h2>
          <p className="text-gray-600 mb-4">This app works only inside Telegram. Please open it through your Telegram bot.</p>
          <a 
            href="https://t.me/Eg_Token_bot" 
            className="inline-block bg-[#0088CC] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0077B3] transition-colors"
          >
            Open Telegram Bot
          </a>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0088CC] mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  const renderActiveSection = () => {
    switch (activeTab) {
      case "earn":
        return <EarnSection user={user} />
      case "quests":
        return <QuestsSection user={user} />
      case "investment":
        return <InvestmentPage user={user} onNavigateToWallet={() => setActiveTab("wallet")} />
      case "friends":
        return <FriendsSection user={user} />
      case "wallet":
        return <WalletSection user={user} />
      default:
        return <EarnSection user={user} />
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative">
      <TopBar user={user} />

      <main className="pb-20 px-4 pt-6">
        {renderActiveSection()}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}