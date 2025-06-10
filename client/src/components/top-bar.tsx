import { User } from "@shared/schema";
import { formatPoints, formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface TopBarProps {
  user: User;
}

export function TopBar({ user }: TopBarProps) {
  // Fetch fresh user data to ensure points are up to date
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/user", user.telegramId],
    initialData: { user },
    refetchInterval: 500, // Refetch every 500ms for better responsiveness
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const currentUser = userData?.user || user;

  return (
    <header className="bg-gradient-to-r from-[#0088CC] to-[#229ED9] text-white p-3 rounded-b-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {currentUser.telegramPhotoUrl ? (
            <img 
              src={currentUser.telegramPhotoUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{currentUser.firstName}</p>
            <p className="text-xs opacity-80">@{currentUser.username}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end space-x-1">
            <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
                10-4.48 10-10S17.52 2 12 2zm-1 17.93c-2.83-.48-5.08-2.72-5.56-5.56H5v-2h1.44c.48-2.83 
                2.72-5.08 5.56-5.56V5h2v1.44c2.83.48 5.08 2.72 5.56 5.56H19v2h-1.44c-.48 2.83-2.72 
                5.08-5.56 5.56V19h-2v-1.07z" />
            </svg>
            <span className="font-bold text-base tracking-wide">{formatPoints(currentUser.points)} AD</span>
          </div>
          <div className="flex justify-end space-x-3 text-xs mt-1 opacity-90">
            <span>{formatCurrency(currentUser.usdBalance, "usd")}</span>
            <span>{formatCurrency(currentUser.egpBalance, "egp")}</span>
          </div>
        </div>
      </div>
    </header>
  )
}