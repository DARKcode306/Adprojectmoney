
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { User } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Users, UserCheck, DollarSign, Trophy } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("")

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"]
  })

  const users = usersData?.users || []

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telegramId.includes(searchTerm)
  )

  const totalUsers = users.length
  const activeUsers = users.filter(user => user.points > 0).length
  const totalPoints = users.reduce((sum, user) => sum + user.points, 0)
  const totalUsdBalance = users.reduce((sum, user) => sum + user.usdBalance, 0)

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total USD Balance</p>
                <p className="text-2xl font-bold">${(totalUsdBalance / 100).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">
                  {searchTerm ? "Try adjusting your search terms" : "Users will appear here once they start using the app"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-gray-700">User</th>
                      <th className="pb-3 font-medium text-gray-700">Telegram ID</th>
                      <th className="pb-3 font-medium text-gray-700">Points</th>
                      <th className="pb-3 font-medium text-gray-700">USD Balance</th>
                      <th className="pb-3 font-medium text-gray-700">EGP Balance</th>
                      <th className="pb-3 font-medium text-gray-700">Ads Today</th>
                      <th className="pb-3 font-medium text-gray-700">Joined</th>
                      <th className="pb-3 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName || ''}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-gray-600">{user.telegramId}</td>
                        <td className="py-4">
                          <Badge variant="secondary">
                            {user.points.toLocaleString()} pts
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-gray-600">
                          ${(user.usdBalance / 100).toFixed(2)}
                        </td>
                        <td className="py-4 text-sm text-gray-600">
                          ₪{(user.egpBalance / 100).toFixed(0)}
                        </td>
                        <td className="py-4 text-sm text-gray-600">{user.adsWatchedToday}</td>
                        <td className="py-4 text-sm text-gray-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-4">
                          <Badge 
                            variant={user.points > 0 ? "default" : "secondary"}
                            className={user.points > 0 ? "bg-green-100 text-green-800" : ""}
                          >
                            {user.points > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
