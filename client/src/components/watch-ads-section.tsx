
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, AdTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getRemainingCooldown } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface WatchAdsSectionProps {
  user: User;
}

export function WatchAdsSection({ user }: WatchAdsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [resetTimerSeconds, setResetTimerSeconds] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastReward, setLastReward] = useState(0);

  const { data: adSettings } = useQuery<{ settings: AdTask }>({
    queryKey: ["/api/tasks/ad"],
  });

  const watchAdMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ads/watch", { userId: user.id }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/user", user.telegramId] });
      const previousUser = queryClient.getQueryData<{ user: User }>(["/api/user", user.telegramId]);

      if (previousUser?.user && adSettings?.settings) {
        const newAdsWatched = previousUser.user.adsWatchedToday + 1;
        const updatedUser = {
          ...previousUser.user,
          points: previousUser.user.points + adSettings.settings.pointsPerView,
          adsWatchedToday: newAdsWatched,
          lastAdWatch: new Date()
        };

        // إذا وصل للحد اليومي، ابدأ تايمر إعادة التعيين
        if (newAdsWatched >= adSettings.settings.dailyLimit) {
          const resetTime = new Date();
          resetTime.setMinutes(resetTime.getMinutes() + 1); // إضافة دقيقة واحدة
          updatedUser.adLimitResetTime = resetTime;
        }

        queryClient.setQueryData(["/api/user", user.telegramId], {
          user: updatedUser
        });
      }

      return { previousUser };
    },
    onSuccess: async (data: any) => {
      setLastReward(data.reward);
      setShowConfirmation(true);

      if (adSettings?.settings?.cooldownSeconds) {
        setCooldownSeconds(adSettings.settings.cooldownSeconds);
      }

      await queryClient.invalidateQueries({ 
        queryKey: ["/api/user", user.telegramId]
      });

      await queryClient.refetchQueries({ 
        queryKey: ["/api/user", user.telegramId],
        type: 'active'
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user", user.telegramId], context.previousUser);
      }
      toast({ 
        title: "Error", 
        description: error.message || "Failed to watch ad", 
        variant: "destructive" 
      });
    },
  });

  // تايمر الكولداون للإعلان التالي
  useEffect(() => {
    if (!adSettings?.settings) {
      setCooldownSeconds(0);
      return;
    }

    const updateTimer = () => {
      if (!user.lastAdWatch) {
        setCooldownSeconds(0);
        return;
      }

      const cooldownInSeconds = 15;
      const remaining = getRemainingCooldown(
        new Date(user.lastAdWatch),
        cooldownInSeconds
      );
      const remainingSeconds = Math.max(0, Math.ceil(remaining / 1000));
      setCooldownSeconds(remainingSeconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user.lastAdWatch, adSettings?.settings]);

  // تايمر إعادة تعيين الحد اليومي
  useEffect(() => {
    const updateResetTimer = () => {
      if (!user.adLimitResetTime) {
        setResetTimerSeconds(0);
        return;
      }

      const resetTime = new Date(user.adLimitResetTime);
      const now = new Date();
      const remainingMs = resetTime.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        // انتهى التايمر، إعادة تعيين الحد اليومي
        setResetTimerSeconds(0);
        // استدعاء API لإعادة تعيين الحد اليومي
        apiRequest("POST", "/api/ads/reset-daily-limit", { userId: user.id })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
          })
          .catch(console.error);
        return;
      }

      const remainingSeconds = Math.ceil(remainingMs / 1000);
      setResetTimerSeconds(remainingSeconds);
    };

    updateResetTimer();
    const interval = setInterval(updateResetTimer, 1000);
    return () => clearInterval(interval);
  }, [user.adLimitResetTime, user.id, queryClient, user.telegramId]);

  const canWatchAd = () => {
    if (!adSettings?.settings) return false;
    if (user.adsWatchedToday >= adSettings.settings.dailyLimit && resetTimerSeconds === 0) return false;
    if (cooldownSeconds > 0) return false;
    return true;
  };

  const progressPercent = adSettings?.settings
    ? (user.adsWatchedToday / adSettings.settings.dailyLimit) * 100
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-lg">Watch Ads</h3>
              <p className="text-white/80 text-sm">
                {adSettings?.settings?.pointsPerView || 500} points per ad
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{user.adsWatchedToday}</div>
            <div className="text-white/80 text-sm">
              /{adSettings?.settings?.dailyLimit || 50} today
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Daily Progress</span>
            <span>
              {user.adsWatchedToday}/{adSettings?.settings?.dailyLimit || 50}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Button
          onClick={() => {
            if (typeof show_8914235 === 'function') {
              show_8914235()
                .then(() => {
                  watchAdMutation.mutate();
                })
                .catch((err) => {
                  console.error("Ad failed to show:", err);
                });
            } else {
              console.warn("Ad function not found.");
            }
          }}
          disabled={!canWatchAd() || watchAdMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4V8a2 2 0 012-2h8a2 2 0 012 2v2M5 18h14"
            />
          </svg>
          {watchAdMutation.isPending ? "Processing..." : "Watch Next Ad"}
        </Button>

        {cooldownSeconds > 0 && (
          <div className="mt-3 text-center text-sm text-gray-500">
            <svg
              className="w-4 h-4 inline mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Next ad available in {cooldownSeconds}s
          </div>
        )}

        {user.adsWatchedToday >= (adSettings?.settings?.dailyLimit || 50) && resetTimerSeconds > 0 && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-orange-600 mb-1">
                🕐 Daily limit reached!
              </div>
              <div className="text-lg font-bold text-orange-700">
                {formatTime(resetTimerSeconds)}
              </div>
              <div className="text-xs text-orange-500">
                Limit will reset after this countdown
              </div>
            </div>
          </div>
        )}

        {user.adsWatchedToday >= (adSettings?.settings?.dailyLimit || 50) && resetTimerSeconds === 0 && (
          <div className="mt-3 text-center text-sm text-orange-500">
            Daily limit reached! Come back tomorrow for more ads.
          </div>
        )}

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          type="ad"
          reward={lastReward}
          onContinue={() => {
            setShowConfirmation(false);
          }}
        />
      </div>
    </div>
  );
}
