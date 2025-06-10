import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AppTask, LinkTask } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

export function TaskManagement() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [newAppTask, setNewAppTask] = useState({
    name: "",
    description: "",
    url: "",
    reward: 0
  })
  
  const [newLinkTask, setNewLinkTask] = useState({
    title: "",
    description: "",
    url: "",
    reward: 0
  })

  const { data: appTasks } = useQuery<{ tasks: AppTask[] }>({
    queryKey: ["/api/tasks/app"]
  })

  const { data: linkTasks } = useQuery<{ tasks: LinkTask[] }>({
    queryKey: ["/api/tasks/link"]
  })

  const createAppTaskMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tasks/app", {
      ...newAppTask,
      isActive: true,
      logoUrl: null
    }),
    onSuccess: () => {
      toast("App task created successfully!")
      setNewAppTask({ name: "", description: "", url: "", reward: 0 })
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/app"] })
    },
    onError: () => {
      toast("Failed to create app task", "error")
    }
  })

  const createLinkTaskMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tasks/link", {
      ...newLinkTask,
      isActive: true
    }),
    onSuccess: () => {
      toast("Link task created successfully!")
      setNewLinkTask({ title: "", description: "", url: "", reward: 0 })
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/link"] })
    },
    onError: () => {
      toast("Failed to create link task", "error")
    }
  })

  const deleteAppTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/app/${id}`),
    onSuccess: () => {
      toast("App task deleted!")
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/app"] })
    },
    onError: () => {
      toast("Failed to delete app task", "error")
    }
  })

  const deleteLinkTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/link/${id}`),
    onSuccess: () => {
      toast("Link task deleted!")
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/link"] })
    },
    onError: () => {
      toast("Failed to delete link task", "error")
    }
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
      
      {/* App Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>App Tasks</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600">Add App Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New App Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="App Name"
                  value={newAppTask.name}
                  onChange={(e) => setNewAppTask(prev => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={newAppTask.description}
                  onChange={(e) => setNewAppTask(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  placeholder="App URL"
                  value={newAppTask.url}
                  onChange={(e) => setNewAppTask(prev => ({ ...prev, url: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Reward Points"
                  value={newAppTask.reward || ""}
                  onChange={(e) => setNewAppTask(prev => ({ ...prev, reward: parseInt(e.target.value) || 0 }))}
                />
                <Button 
                  onClick={() => createAppTaskMutation.mutate()}
                  disabled={createAppTaskMutation.isPending}
                  className="w-full"
                >
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {appTasks?.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{task.name}</h4>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <p className="text-sm text-green-600">+{task.reward} points</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAppTaskMutation.mutate(task.id)}
                  disabled={deleteAppTaskMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Link Tasks</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">Add Link Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Link Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Task Title"
                  value={newLinkTask.title}
                  onChange={(e) => setNewLinkTask(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={newLinkTask.description}
                  onChange={(e) => setNewLinkTask(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  placeholder="Link URL"
                  value={newLinkTask.url}
                  onChange={(e) => setNewLinkTask(prev => ({ ...prev, url: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Reward Points"
                  value={newLinkTask.reward || ""}
                  onChange={(e) => setNewLinkTask(prev => ({ ...prev, reward: parseInt(e.target.value) || 0 }))}
                />
                <Button 
                  onClick={() => createLinkTaskMutation.mutate()}
                  disabled={createLinkTaskMutation.isPending}
                  className="w-full"
                >
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {linkTasks?.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <p className="text-sm text-green-600">+{task.reward} points</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLinkTaskMutation.mutate(task.id)}
                  disabled={deleteLinkTaskMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
