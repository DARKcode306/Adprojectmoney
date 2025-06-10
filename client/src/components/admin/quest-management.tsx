
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Quest } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

export function QuestManagement() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [newQuest, setNewQuest] = useState({
    title: "",
    description: "",
    type: "watch_ads",
    target: 1,
    reward: 100,
    icon: "video"
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: quests } = useQuery<{ quests: Quest[] }>({
    queryKey: ["/api/quests"]
  })

  const validateQuest = () => {
    const newErrors: Record<string, string> = {}
    
    if (!newQuest.title.trim()) {
      newErrors.title = "عنوان المهمة مطلوب"
    }
    
    if (!newQuest.description.trim()) {
      newErrors.description = "وصف المهمة مطلوب"
    }
    
    if (!newQuest.target || newQuest.target < 1) {
      newErrors.target = "الهدف يجب أن يكون أكبر من 0"
    }
    
    if (!newQuest.reward || newQuest.reward < 1) {
      newErrors.reward = "المكافأة يجب أن تكون أكبر من 0"
    }

    // Specific validation based on quest type
    if (newQuest.type === "watch_ads" && newQuest.target > 50) {
      newErrors.target = "مشاهدة الإعلانات: الحد الأقصى 50 إعلان يومياً"
    }
    
    if (newQuest.type === "invite_friends" && newQuest.target > 20) {
      newErrors.target = "دعوة الأصدقاء: الحد الأقصى 20 صديق"
    }
    
    if (newQuest.type === "complete_tasks" && newQuest.target > 10) {
      newErrors.target = "إكمال المهام: الحد الأقصى 10 مهام"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createQuestMutation = useMutation({
    mutationFn: () => {
      if (!validateQuest()) {
        throw new Error("بيانات غير صحيحة")
      }
      
      return apiRequest("POST", "/api/admin/quests", {
        ...newQuest,
        isActive: true
      })
    },
    onSuccess: () => {
      toast({ title: "تم إنشاء المهمة بنجاح!" })
      setNewQuest({ 
        title: "", 
        description: "", 
        type: "watch_ads", 
        target: 1, 
        reward: 100, 
        icon: "video" 
      })
      setErrors({})
      queryClient.invalidateQueries({ queryKey: ["/api/quests"] })
    },
    onError: (error) => {
      toast({ 
        title: "فشل في إنشاء المهمة", 
        description: error.message,
        variant: "destructive" 
      })
    }
  })

  const deleteQuestMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/quests/${id}`),
    onSuccess: () => {
      toast({ title: "تم حذف المهمة!" })
      queryClient.invalidateQueries({ queryKey: ["/api/quests"] })
    },
    onError: () => {
      toast({ 
        title: "فشل في حذف المهمة", 
        variant: "destructive" 
      })
    }
  })

  const getQuestTypeLabel = (type: string) => {
    switch (type) {
      case "watch_ads": return "مشاهدة الإعلانات"
      case "invite_friends": return "دعوة الأصدقاء"
      case "complete_tasks": return "إكمال المهام"
      default: return type
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "watch_ads": return "video"
      case "invite_friends": return "users"
      case "complete_tasks": return "check-circle"
      default: return "star"
    }
  }

  const getQuestTypeDescription = (type: string) => {
    switch (type) {
      case "watch_ads": return "المستخدم يحتاج لمشاهدة عدد معين من الإعلانات"
      case "invite_friends": return "المستخدم يحتاج لدعوة عدد معين من الأصدقاء"
      case "complete_tasks": return "المستخدم يحتاج لإكمال عدد معين من المهام"
      default: return ""
    }
  }

  const getRecommendedValues = (type: string) => {
    switch (type) {
      case "watch_ads": 
        return { target: { min: 1, max: 50, recommended: 5 }, reward: { min: 100, recommended: 500 } }
      case "invite_friends": 
        return { target: { min: 1, max: 20, recommended: 3 }, reward: { min: 500, recommended: 1000 } }
      case "complete_tasks": 
        return { target: { min: 1, max: 10, recommended: 2 }, reward: { min: 200, recommended: 800 } }
      default: 
        return { target: { min: 1, max: 100, recommended: 1 }, reward: { min: 100, recommended: 500 } }
    }
  }

  const handleTypeChange = (value: string) => {
    const recommended = getRecommendedValues(value)
    setNewQuest(prev => ({ 
      ...prev, 
      type: value, 
      icon: getIconForType(value),
      target: recommended.target.recommended,
      reward: recommended.reward.recommended
    }))
    setErrors({})
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800">إدارة المهام اليومية</h2>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>المهام النشطة</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600">إضافة مهمة جديدة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">عنوان المهمة *</label>
                  <Input
                    placeholder="مثال: شاهد 5 إعلانات"
                    value={newQuest.title}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, title: e.target.value }))}
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">وصف المهمة *</label>
                  <Textarea
                    placeholder="وصف تفصيلي للمهمة وما يحتاج المستخدم لفعله"
                    value={newQuest.description}
                    onChange={(e) => setNewQuest(prev => ({ ...prev, description: e.target.value }))}
                    className={errors.description ? "border-red-500" : ""}
                    rows={3}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">نوع المهمة *</label>
                  <Select 
                    value={newQuest.type} 
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المهمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="watch_ads">مشاهدة الإعلانات</SelectItem>
                      <SelectItem value="invite_friends">دعوة الأصدقاء</SelectItem>
                      <SelectItem value="complete_tasks">إكمال المهام</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">{getQuestTypeDescription(newQuest.type)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      الهدف المطلوب * 
                      <span className="text-xs text-gray-500">
                        (الحد الأقصى: {getRecommendedValues(newQuest.type).target.max})
                      </span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={getRecommendedValues(newQuest.type).target.max}
                      placeholder="مثال: 5"
                      value={newQuest.target || ""}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, target: parseInt(e.target.value) || 1 }))}
                      className={errors.target ? "border-red-500" : ""}
                    />
                    {errors.target && <p className="text-red-500 text-sm mt-1">{errors.target}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      القيمة المقترحة: {getRecommendedValues(newQuest.type).target.recommended}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      مكافأة النقاط *
                      <span className="text-xs text-gray-500">
                        (الحد الأدنى: {getRecommendedValues(newQuest.type).reward.min})
                      </span>
                    </label>
                    <Input
                      type="number"
                      min={getRecommendedValues(newQuest.type).reward.min}
                      placeholder="مثال: 500"
                      value={newQuest.reward || ""}
                      onChange={(e) => setNewQuest(prev => ({ ...prev, reward: parseInt(e.target.value) || 100 }))}
                      className={errors.reward ? "border-red-500" : ""}
                    />
                    {errors.reward && <p className="text-red-500 text-sm mt-1">{errors.reward}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      القيمة المقترحة: {getRecommendedValues(newQuest.type).reward.recommended}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">معاينة المهمة:</h4>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      {newQuest.icon === "video" && (
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      {newQuest.icon === "users" && (
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      )}
                      {newQuest.icon === "check-circle" && (
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{newQuest.title || "عنوان المهمة"}</h4>
                      <p className="text-sm text-gray-600">{newQuest.description || "وصف المهمة"}</p>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {getQuestTypeLabel(newQuest.type)}
                        </span>
                        <span className="text-xs text-gray-500">الهدف: {newQuest.target}</span>
                        <span className="text-xs text-green-600 font-medium">+{newQuest.reward} نقطة</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => createQuestMutation.mutate()}
                  disabled={createQuestMutation.isPending}
                  className="w-full bg-purple-500 hover:bg-purple-600"
                >
                  {createQuestMutation.isPending ? "جاري الإنشاء..." : "إنشاء المهمة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {quests?.quests.map((quest) => (
              <div key={quest.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    {quest.icon === "video" && (
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    {quest.icon === "users" && (
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    )}
                    {quest.icon === "check-circle" && (
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{quest.title}</h4>
                    <p className="text-sm text-gray-600">{quest.description}</p>
                    <div className="flex items-center space-x-4 rtl:space-x-reverse mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {getQuestTypeLabel(quest.type)}
                      </span>
                      <span className="text-xs text-gray-500">الهدف: {quest.target}</span>
                      <span className="text-xs text-green-600 font-medium">+{quest.reward} نقطة</span>
                      <span className={`text-xs px-2 py-1 rounded ${quest.target > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {quest.target > 0 ? 'صحيح' : 'خطأ - هدف صفر!'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteQuestMutation.mutate(quest.id)}
                  disabled={deleteQuestMutation.isPending}
                >
                  حذف
                </Button>
              </div>
            ))}
            
            {(!quests?.quests || quests.quests.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p>لم يتم إنشاء أي مهام بعد</p>
                <p className="text-sm mt-1">أنشئ مهمتك الأولى للبدء!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
