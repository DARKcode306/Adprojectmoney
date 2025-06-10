import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "earn", label: "Earn", icon: "coins" },
    { id: "quests", label: "Quests", icon: "trophy" },
    { id: "investment", label: "Investment", icon: "investment" },
    { id: "friends", label: "Friends", icon: "users" },
    { id: "wallet", label: "Wallet", icon: "wallet" }
  ]

  const getIcon = (iconType: string, isActive: boolean) => {
    const baseClass = "w-5 h-5 transition-all duration-300"
    const activeClass = isActive ? "text-[#0088CC] scale-110" : "text-gray-400"
    
    switch (iconType) {
      case "coins":
        return (
          <svg className={cn(baseClass, activeClass)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      case "trophy":
        return (
          <svg className={cn(baseClass, activeClass)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
      case "users":
        return (
          <svg className={cn(baseClass, activeClass)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={isActive ? "2.5" : "2"} 
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
            {isActive && (
              <circle 
                cx="18" 
                cy="5" 
                r="2.5" 
                fill="#0088CC" 
                className="animate-ping opacity-75"
              />
            )}
          </svg>
        )
      case "investment":
        return (
          <svg className={cn(baseClass, activeClass)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case "wallet":
        return (
          <svg className={cn(baseClass, activeClass)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-4 py-1 shadow-sm">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all duration-200",
                isActive ? "bg-blue-50" : "hover:bg-gray-50"
              )}
            >
              {getIcon(tab.icon, isActive)}
              <span className={cn(
                "text-xs font-medium mt-0.5",
                isActive ? "text-[#0088CC] font-semibold" : "text-gray-500"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}