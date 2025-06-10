import { User } from "@shared/schema";
import { DailyRewardSection } from "./daily-reward-section";
import { WatchAdsSection } from "./watch-ads-section";
import { AppTasksSection } from "./app-tasks-section";
import { LinkTasksSection } from "./link-tasks-section";

interface EarnSectionProps {
  user: User;
}

export function EarnSection({ user }: EarnSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Start Earning Today! 💰
        </h2>
        <p className="text-gray-600 text-sm">
          Complete tasks below to earn points and convert them to real money.
        </p>
      </div>

      {/* Daily Reward Section */}
      <DailyRewardSection user={user} />

      {/* Watch Ads Section */}
      <WatchAdsSection user={user} />

      {/* App Tasks Section */}
      <AppTasksSection user={user} />

      {/* Link Tasks Section */}
      <LinkTasksSection user={user} />
    </div>
  );
}