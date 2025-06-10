
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface DailyRewardSectionProps {
  user: User;
}

export function DailyRewardSection({ user }: DailyRewardSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canCollect, setCanCollect] = useState(true);

  // Check if user can collect based on localStorage
  useEffect(() => {
    const lastCollectTime = localStorage.getItem(`lastCollect_${user.id}`);
    if (lastCollectTime) {
      const lastTime = parseInt(lastCollectTime);
      const now = Date.now();
      const timeDiff = now - lastTime;
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (timeDiff < thirtyMinutes) {
        setTimeRemaining(thirtyMinutes - timeDiff);
        setCanCollect(false);
      } else {
        setCanCollect(true);
        setTimeRemaining(0);
      }
    }
  }, [user.id]);

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setCanCollect(true);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const collectPointsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ads/watch", { userId: user.id }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/user", user.telegramId] });
      
      const previousUser = queryClient.getQueryData<{ user: User }>(["/api/user", user.telegramId]);
      
      // Optimistically update user points
      if (previousUser?.user) {
        queryClient.setQueryData(["/api/user", user.telegramId], {
          user: {
            ...previousUser.user,
            points: previousUser.user.points + 100,
          }
        });
      }
      
      return { previousUser };
    },
    onSuccess: async (data: any) => {
      // Store collection time
      localStorage.setItem(`lastCollect_${user.id}`, Date.now().toString());
      
      // Start 30-minute countdown
      setTimeRemaining(30 * 60 * 1000);
      setCanCollect(false);
      
      // Show confirmation modal
      setShowConfirmation(true);

      // Show success toast
      toast({
        title: "Points Collected!",
        description: "You've earned 100 points",
        variant: "default",
      });

      // Invalidate and refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user", user.telegramId], context.previousUser);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to collect points",
        variant: "destructive",
      });
    },
  });

  // Format time remaining
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for circular progress
  const totalTime = 30 * 60 * 1000; // 30 minutes
  const progress = timeRemaining > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 100;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        {/* Timer Section */}
        <div className="flex items-center space-x-3">
          <div className="relative w-16 h-16">
            {/* Background circle */}
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                className={canCollect ? "text-green-500" : "text-blue-500"}
                style={{
                  transition: "stroke-dashoffset 1s ease-in-out",
                }}
              />
            </svg>
            {/* Timer text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {canCollect ? "Ready!" : formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Bonus Points
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Collect every 30 minutes
            </div>
          </div>
        </div>

        {/* Reward Info */}
        <div className="text-center">
          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-300">Reward</div>
            <div className="font-bold text-green-600 dark:text-green-400 text-sm">
              +100 Points
            </div>
          </div>
        </div>

        {/* Collect Button */}
        <div>
          <Button
            onClick={() => {
              if (canCollect && !collectPointsMutation.isPending) {
                collectPointsMutation.mutate();
              }
            }}
            disabled={!canCollect || collectPointsMutation.isPending}
            className={`h-10 px-4 text-sm ${
              canCollect 
                ? "bg-green-500 hover:bg-green-600" 
                : "bg-gray-400 cursor-not-allowed"
            } disabled:opacity-50`}
          >
            {collectPointsMutation.isPending
              ? "Collecting..."
              : canCollect
              ? "Collect"
              : "Wait"}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Bonus Collection</span>
          <span>{canCollect ? "Available Now" : "Next reward in progress"}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              canCollect ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        type="task"
        reward={100}
        taskName="Bonus Collection"
        onContinue={() => {
          setShowConfirmation(false);
        }}
      />
    </div>
  );
}
