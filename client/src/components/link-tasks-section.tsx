import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, LinkTask } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface LinkTasksSectionProps {
  user: User;
}

export function LinkTasksSection({ user }: LinkTasksSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastReward, setLastReward] = useState(0);
  const [completedTaskTitle, setCompletedTaskTitle] = useState("");

  const { data: linkTasks } = useQuery<{ tasks: LinkTask[] }>({
    queryKey: ["/api/tasks/link"],
  });

  const { data: completions } = useQuery<{ completions: any[] }>({
    queryKey: ["/api/tasks/completions", user.id],
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, taskTitle }: { taskId: number; taskTitle: string }) => 
      apiRequest("POST", "/api/tasks/complete", { 
        userId: user.id, 
        taskType: "link", 
        taskId 
      }).then(data => ({ ...data, taskTitle })),
    onMutate: async ({ taskType, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user", user.telegramId] });
      await queryClient.cancelQueries({ queryKey: ["/api/tasks/completions", user.id] });

      const previousUser = queryClient.getQueryData<{ user: User }>(["/api/user", user.telegramId]);
      const previousCompletions = queryClient.getQueryData<{ completions: any[] }>(["/api/tasks/completions", user.id]);

      // Find task reward
      const task = linkTasks?.tasks.find(t => t.id === taskId);
      const reward = task?.reward || 50;

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
          completions: [...previousCompletions.completions, { taskType, taskId }],
        });
      }

      return { previousUser, previousCompletions };
    },
    onSuccess: async (data: any) => {
      // Store reward and task info, show confirmation modal
      setLastReward(data.reward);
      setCompletedTaskTitle(data.taskTitle);
      setShowConfirmation(true);

      // Invalidate and refetch user data immediately
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/user", user.telegramId] 
      });

      // Force immediate refetch
      await queryClient.refetchQueries({ 
        queryKey: ["/api/user", user.telegramId],
        type: 'active'
      });

      // Invalidate link tasks cache
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/tasks/link"] 
      });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/user", user.telegramId], context.previousUser);
      }
      if (context?.previousCompletions) {
        queryClient.setQueryData(["/api/tasks/completions", user.id], context.previousCompletions);
      }
      toast(error.message || "Failed to complete task", "error");
    },
  });

  const isTaskCompleted = (taskType: string, taskId: number) => {
    return completions?.completions.some(
      (c) => c.taskType === taskType && c.taskId === taskId
    );
  };

  if (!linkTasks?.tasks.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-1">No Link Tasks Available</h3>
        <p className="text-sm text-gray-500">Check back later for new tasks!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
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
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-lg">Link Tasks</h3>
            <p className="text-white/80 text-sm">
              Visit links to earn quick points
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {linkTasks.tasks.map((task) => {
          const completed = isTaskCompleted("link", task.id);
          return (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{task.title}</h4>
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
                      completeTaskMutation.mutate({ taskId: task.id, taskTitle: task.title });
                    }}
                    disabled={completeTaskMutation.isPending}
                  >
                    Visit →
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
        title="Task Completed!"
        message={`Congratulations! You've earned +${lastReward} points for completing "${completedTaskTitle}".`}
        reward={lastReward}
      />
    </div>
  );
}