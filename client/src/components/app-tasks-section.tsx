import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, AppTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface AppTasksSectionProps {
  user: User;
}

export function AppTasksSection({ user }: AppTasksSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastReward, setLastReward] = useState(0);
  const [completedTaskName, setCompletedTaskName] = useState("");

  const { data: appTasks } = useQuery<{ tasks: AppTask[] }>({
    queryKey: ["/api/tasks/app"],
  });

  const { data: completions } = useQuery<{ completions: any[] }>({
    queryKey: ["/api/tasks/completions", user.id],
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, taskName }: { taskId: number; taskName: string }) =>
      apiRequest("POST", "/api/tasks/complete", { userId: user.id, taskType: "app", taskId }).then(data => ({ ...data, taskName })),
    onMutate: async ({ taskId }: { taskId: number }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user", user.telegramId] });
      await queryClient.cancelQueries({ queryKey: ["/api/tasks/completions", user.id] });

      const previousUser = queryClient.getQueryData<{ user: User }>(["/api/user", user.telegramId]);
      const previousCompletions = queryClient.getQueryData<{ completions: any[] }>(["/api/tasks/completions", user.id]);

      // Find task reward
      const task = appTasks?.tasks.find(t => t.id === taskId);
      const reward = task?.reward || 100;

      if (previousUser?.user) {
        queryClient.setQueryData(["/api/user", user.telegramId], {
          user: {
            ...previousUser.user,
            points: previousUser.user.points + reward,
          }
        });
      }

      if (previousCompletions) {
        queryClient.setQueryData(["/api/tasks/completions", user.id], {
          completions: [...previousCompletions.completions, { taskType: "app", taskId }],
        });
      }

      return { previousUser, previousCompletions };
    },
    onSuccess: async (data: any) => {
      // Store reward and task info, show confirmation modal
      setLastReward(data.reward);
      setCompletedTaskName(data.taskName);
      setShowConfirmation(true);

      // Invalidate and refetch all related queries immediately
      await queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/completions", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/app"] });

      // Force immediate refetch
      await queryClient.refetchQueries({ 
        queryKey: ["/api/user", user.telegramId],
        type: 'active'
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user", user.telegramId], context.previousUser);
      }
      if (context?.previousCompletions) {
        queryClient.setQueryData(["/api/tasks/completions", user.id], context.previousCompletions);
      }
      toast({ title: "Error", description: error.message || "Failed to complete task", variant: "destructive" });
    },
  });

  const isTaskCompleted = (taskType: string, taskId: number) => {
    return completions?.completions.some(
      (c) => c.taskType === taskType && c.taskId === taskId
    );
  };

  if (!appTasks?.tasks.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-1">No App Tasks Available</h3>
        <p className="text-sm text-gray-500">Check back later for new tasks!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
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
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-lg">App Tasks</h3>
            <p className="text-white/80 text-sm">
              Install & join apps for big rewards
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {appTasks.tasks.map((task) => {
          const completed = isTaskCompleted("app", task.id);
          return (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{task.name}</h4>
                  <p className="text-sm text-gray-600">{task.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-semibold ${
                    completed ? "text-gray-400" : "text-green-500"
                  }`}
                >
                  +{task.reward}
                </div>
                {completed ? (
                  <span className="text-green-500 text-sm">✓ Completed</span>
                ) : (
                  <Button
                    variant="link"
                    className="text-[#0088CC] text-sm p-0 h-auto"
                    onClick={() => {
                      window.open(task.url, "_blank");
                      completeTaskMutation.mutate({ taskId: task.id, taskName: task.name });
                    }}
                    disabled={completeTaskMutation.isPending}
                  >
                    Join →
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        type="task"
        reward={lastReward}
        taskName={completedTaskName}
        onContinue={() => {
          setShowConfirmation(false);
        }}
      />
    </div>
  );
}