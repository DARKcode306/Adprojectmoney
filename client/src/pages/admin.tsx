import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { WithdrawalRequest } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskManagement } from "@/components/admin/task-management"
import { QuestManagement } from "@/components/admin/quest-management"
import { WalletManagement } from "@/components/admin/wallet-management"
import { UserManagement } from "@/components/admin/user-management"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { InvestmentManagement } from "@/components/admin/investment-management"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("tasks")
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: withdrawals } = useQuery<{ requests: WithdrawalRequest[] }>({
    queryKey: ["/api/withdrawals"]
  })

  const tabs = [
    { id: "tasks", label: "Tasks", icon: "📋" },
    { id: "quests", label: "Quests", icon: "🏆" },
    { id: "investment", label: "Investment", icon: "📈" },
    { id: "wallet", label: "Wallet", icon: "💰" },
    { id: "withdrawals", label: "Withdrawals", icon: "💸" },
    { id: "users", label: "Users", icon: "👥" }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "approved": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600 mt-2">Manage your Telegram Mini App</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#0088CC] text-[#0088CC]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === "tasks" && <TaskManagement />}

          {activeTab === "quests" && <QuestManagement />}

          {activeTab === "wallet" && <WalletManagement />}

          {activeTab === "withdrawals" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Withdrawal Requests</h2>

              {withdrawals?.requests.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawal requests</h3>
                  <p className="text-gray-600">All withdrawal requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals?.requests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">User ID: {request.userId}</h4>
                              <p className="text-sm text-gray-600">
                                Amount: {request.currency.toUpperCase()} {(request.amount / 100).toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600">Method: {request.method}</p>
                              {request.accountDetails && (
                                <p className="text-sm text-gray-600">Account: {request.accountDetails}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {new Date(request.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === "pending" 
                                  ? "bg-yellow-100 text-yellow-800"
                                  : request.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", `/api/admin/withdrawals/${request.id}/approve`, {});
                                    toast("Withdrawal request approved!");
                                    queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
                                  } catch (error: any) {
                                    toast(error.message || "Failed to approve withdrawal", "error");
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", `/api/admin/withdrawals/${request.id}/reject`, {});
                                    toast("Withdrawal request rejected and amount refunded!");
                                    queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
                                  } catch (error: any) {
                                    toast(error.message || "Failed to reject withdrawal", "error");
                                  }
                                }}
                              >
                                Reject & Refund
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && <UserManagement />}

          {activeTab === "investment" && <InvestmentManagement />}
        </div>
      </div>
    </div>
  )
}