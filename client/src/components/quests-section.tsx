import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Quest, QuestProgress, User } from "@shared/schema"
import { apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"

interface QuestsSectionProps {
  user: User
}

declare global {
  interface Window {
    show_8914235: (type: string) => Promise<void>;
  }
}

export function QuestsSection({ user }: QuestsSectionProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [lastReward, setLastReward] = useState(0)
  const [completedQuestTitle, setCompletedQuestTitle] = useState("")
  const [isProcessingClaim, setIsProcessingClaim] = useState(false)

  const { data: quests } = useQuery<{ quests: Quest[] }>({
    queryKey: ["/api/quests"]
  })

  const { data: progress } = useQuery<{ progress: QuestProgress[] }>({
    queryKey: ["/api/quests/progress", user.id]
  })

  const { data: taskCompletions } = useQuery<{ completions: any[] }>({
    queryKey: ["/api/tasks/completions", user.id]
  })

  const { data: referrals } = useQuery<{ referrals: any[] }>({
    queryKey: ["/api/referrals", user.id]
  })

  const claimRewardMutation = useMutation({
    mutationFn: ({ questId, questTitle }: { questId: number; questTitle: string }) => 
      apiRequest("POST", "/api/quests/claim", { userId: user.id, questId }).then(data => ({ ...data, questTitle })),
    onMutate: async ({ questId, questTitle }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user", user.telegramId] });

      const previousUser = queryClient.getQueryData<{ user: User }>(["/api/user", user.telegramId]);

      // Find quest reward for optimistic update
      const quest = quests?.quests.find(q => q.id === questId);
      const reward = quest?.reward || 0;

      // Optimistically update user data
      if (previousUser?.user) {
        queryClient.setQueryData(["/api/user", user.telegramId], {
          user: {
            ...previousUser.user,
            points: previousUser.user.points + reward
          }
        });
      }

      return { previousUser, questTitle };
    },
    onSuccess: async (data: any, variables, context) => {
      // Store reward and quest info, show confirmation modal
      setLastReward(data.reward);
      setCompletedQuestTitle(context?.questTitle || "Quest");
      setShowConfirmation(true);
      setIsProcessingClaim(false);

      // Force refresh all user-related data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/quests/progress", user.id] }),
        queryClient.refetchQueries({ queryKey: ["/api/user", user.telegramId] }),
        queryClient.refetchQueries({ queryKey: ["/api/quests/progress", user.id] }),
      ])
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user", user.telegramId], context.previousUser);
      }
      setIsProcessingClaim(false);
      toast({ title: "Error", description: error.message || "Failed to claim reward", variant: "destructive" });
    }
  })

  const handleClaimReward = async (questId: number, questTitle: string) => {
    setIsProcessingClaim(true);
    
    try {
      // Show ad before claiming the reward
      await window.show_8914235('pop');
      
      // If ad was watched successfully, proceed with claiming the reward
      claimRewardMutation.mutate({ questId, questTitle });
    } catch (e) {
      setIsProcessingClaim(false);
      toast({ title: "Error", description: "Please watch the ad to claim your reward", variant: "destructive" });
    }
  }

  const getQuestProgress = (questId: number) => {
    return progress?.progress.find(p => p.questId === questId)
  }

  const getActualProgress = (quest: Quest) => {
    // Calculate progress based on quest type using real data
    switch (quest.type) {
      case "watch_ads":
        return user.adsWatchedToday || 0
      case "invite_friends":
        return referrals?.referrals?.length || 0
      case "complete_tasks":
        return taskCompletions?.completions?.length || 0
      default:
        return 0
    }
  }

  const getQuestIcon = (icon: string) => {
    switch (icon) {
      case "users":
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        )
      case "video":
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Daily Quests 🎯</h2>
        <p className="text-gray-600">Complete special missions for bonus rewards</p>
      </div>

      {quests?.quests.map((quest) => {
        const actualProgress = getActualProgress(quest)
        const questProgress = getQuestProgress(quest.id)
        const isCompleted = questProgress?.isCompleted || false
        const hasReachedTarget = actualProgress >= quest.target
        const progressPercent = Math.min((actualProgress / quest.target) * 100, 100)
        
        // Can claim only if target is reached AND not yet completed
        const canClaim = hasReachedTarget && !isCompleted

        return (
          <div key={quest.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center">
                  {getQuestIcon(quest.icon)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{quest.title}</h3>
                  <p className="text-sm text-gray-600">{quest.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-purple-500 font-bold text-lg">+{quest.reward}</div>
                <div className="text-sm text-gray-500">points</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{actualProgress}/{quest.target}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {canClaim ? (
              <Button 
                onClick={() => handleClaimReward(quest.id, quest.title)}
                disabled={isProcessingClaim || claimRewardMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-400 to-purple-500 hover:opacity-90"
              >
                {isProcessingClaim || claimRewardMutation.isPending ? "جاري التجميع..." : "تجميع المكافأة"}
              </Button>
            ) : isCompleted ? (
              <Button 
                disabled 
                className="w-full bg-green-100 text-green-600 cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                تم التجميع
              </Button>
            ) : (
              <Button 
                disabled 
                className="w-full bg-gray-100 text-gray-500 cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                يحتاج {quest.target - actualProgress} أكثر
              </Button>
            )}
          </div>
        )
      })}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        type="quest"
        reward={lastReward}
        taskName={completedQuestTitle}
        onContinue={() => {
          setShowConfirmation(false);
        }}
      />
    </div>
  )
}