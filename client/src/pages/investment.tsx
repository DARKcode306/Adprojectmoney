import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { User, InvestmentPackage, UserInvestment } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface InvestmentPageProps {
  user: User
  onNavigateToWallet: () => void
}

export default function InvestmentPage({ user, onNavigateToWallet }: InvestmentPageProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("own")
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    package?: InvestmentPackage
    balance: number
    required: number
    currency: string
  }>({ open: false, balance: 0, required: 0, currency: "usd" })

  const [adRewardDialog, setAdRewardDialog] = useState<{
    open: boolean
    reward: number
    currency: string
    adsRemaining: number
  }>({ open: false, reward: 0, currency: "usd", adsRemaining: 0 })

  const { data: ownPackages } = useQuery<{ packages: InvestmentPackage[] }>({
    queryKey: ["/api/investments", "own"],
    queryFn: () => apiRequest("GET", "/api/investments?type=own")
  })

  const { data: pointsPackages } = useQuery<{ packages: InvestmentPackage[] }>({
    queryKey: ["/api/investments", "points"],
    queryFn: () => apiRequest("GET", "/api/investments?type=points")
  })

  const { data: userInvestments, refetch: refetchInvestments } = useQuery<{ investments: (UserInvestment & { package?: InvestmentPackage })[] }>({
    queryKey: ["/api/user", user.id, "investments"],
    queryFn: () => apiRequest("GET", `/api/user/${user.id}/investments`)
  })

  const subscribeMutation = useMutation({
    mutationFn: (packageId: number) => apiRequest("POST", "/api/investments/subscribe", {
      userId: user.id,
      packageId
    }),
    onSuccess: (data) => {
      if (data.redirectToDeposit) {
        toast("Please deposit money first")
        onNavigateToWallet()
      } else {
        toast("🎉 Successfully subscribed to investment package!")
        queryClient.invalidateQueries({ queryKey: ["/api/user"] })
        queryClient.invalidateQueries({ queryKey: ["/api/user", user.id, "investments"] })
        refetchInvestments()
      }
      setConfirmDialog({ open: false, balance: 0, required: 0, currency: "usd" })
    },
    onError: (error: any) => {
      toast(error.message || "Failed to subscribe", "error")
      setConfirmDialog({ open: false, balance: 0, required: 0, currency: "usd" })
    }
  })

  const watchAdMutation = useMutation({
    mutationFn: ({ investmentId, packageData }: { investmentId: number, packageData: InvestmentPackage }) => 
      apiRequest("POST", "/api/investments/watch-ad", {
        userId: user.id,
        investmentId,
        packageData
      }),
    onSuccess: (data) => {
      setAdRewardDialog({
        open: true,
        reward: data.reward,
        currency: data.currency,
        adsRemaining: data.adsRemaining || 0
      })
      queryClient.invalidateQueries({ queryKey: ["/api/user"] })
      queryClient.invalidateQueries({ queryKey: ["/api/user", user.id, "investments"] })
      refetchInvestments()
    },
    onError: (error: any) => {
      toast(error.message || "Failed to watch ad", "error")
    }
  })

  const handleSubscribe = (package_: InvestmentPackage) => {
    let balance = 0
    let currency = ""

    if (package_.type === "points") {
      if (package_.rewardCurrency === "points") {
        balance = user.points
        currency = "points"
      } else if (package_.rewardCurrency === "coin") {
        balance = user.coinBalance
        currency = "coin"
      } else if (package_.rewardCurrency === "usd") {
        balance = user.investmentUsdBalance || 0
        currency = "usd"
      } else if (package_.rewardCurrency === "egp") {
        balance = user.investmentEgpBalance || 0
        currency = "egp"
      }
    } else {
      if (package_.rewardCurrency === "usd") {
        balance = user.usdBalance
        currency = "usd"
      } else if (package_.rewardCurrency === "egp") {
        balance = user.egpBalance
        currency = "egp"
      }
    }

    if (balance < package_.price) {
      toast("💔 Insufficient balance", "error")
      return
    }

    setConfirmDialog({
      open: true,
      package: package_,
      balance,
      required: package_.price,
      currency
    })
  }

  const confirmSubscription = () => {
    if (confirmDialog.package) {
      subscribeMutation.mutate(confirmDialog.package.id)
    }
  }

  const isPackageSubscribed = (packageId: number) => {
    return userInvestments?.investments.some(inv => 
      inv.packageId === packageId && inv.isActive && new Date(inv.endDate) > new Date()
    ) || false
  }

  const canCompleteTask = (investment: UserInvestment & { package?: InvestmentPackage }) => {
    const today = new Date().toISOString().split('T')[0]
    const lastTaskDate = investment.lastTaskDate ? new Date(investment.lastTaskDate).toISOString().split('T')[0] : null
    return lastTaskDate !== today
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getAdWatchesRemaining = (investment: UserInvestment) => {
    const today = new Date().toISOString().split('T')[0]
    const lastAdDate = investment.lastAdWatch ? new Date(investment.lastAdWatch).toISOString().split('T')[0] : null
    const adsWatchedToday = lastAdDate === today ? (investment.adsWatchedToday || 0) : 0
    return Math.max(0, 10 - adsWatchedToday)
  }

  const canWatchAd = (investment: UserInvestment) => {
    return getAdWatchesRemaining(investment) > 0
  }

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "usd": return "💵"
      case "egp": return "💰"
      case "points": return "🎯"
      case "coin": return "🪙"
      default: return "💎"
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === "usd") return formatCurrency(amount, "usd")
    if (currency === "egp") return formatCurrency(amount, "egp")
    return `${amount.toLocaleString()} ${currency}`
  }

  const PackageCard = ({ package_: pkg, type }: { package_: InvestmentPackage, type: string }) => {
    const isSubscribed = isPackageSubscribed(pkg.id)
    const totalReturn = pkg.rewardPerTask * pkg.numberOfDays
    const roi = ((totalReturn - pkg.price) / pkg.price * 100).toFixed(1)
    const userInvestment = userInvestments?.investments.find(inv => inv.packageId === pkg.id && inv.isActive)

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">{pkg.title}</h3>
            {isSubscribed && (
              <Badge className="bg-green-500 text-white">
                ✅ Active
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {getCurrencyIcon(pkg.rewardCurrency)} {formatAmount(pkg.price, pkg.rewardCurrency)}
            </div>
            <div className="text-sm text-blue-100">
              Investment Cost
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-600 mb-1">Duration</div>
              <div className="text-lg font-bold text-blue-600">⏰ {pkg.numberOfDays} days</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-600 mb-1">Daily Reward</div>
              <div className="text-lg font-bold text-green-600">
                {getCurrencyIcon(pkg.rewardCurrency)} {formatAmount(pkg.rewardPerTask, pkg.rewardCurrency)}
              </div>
            </div>
          </div>

          {/* ROI Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-700">💰 Total Return</span>
              <span className="text-sm font-bold text-green-600">+{roi}% ROI</span>
            </div>
            <div className="text-xl font-bold text-green-700">
              {getCurrencyIcon(pkg.rewardCurrency)} {formatAmount(totalReturn, pkg.rewardCurrency)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Profit: +{formatAmount(totalReturn - pkg.price, pkg.rewardCurrency)}
            </div>
          </div>

          {/* Action Button */}
          {!isSubscribed ? (
            <Button 
              onClick={() => handleSubscribe(pkg)}
              disabled={subscribeMutation.isPending}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
            >
              {subscribeMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🚀 Subscribe Now</span>
                </div>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="text-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm font-bold text-green-700">Investment Active</span>
                </div>
                <p className="text-xs text-green-600 mt-1">Earning daily rewards & watching ads</p>
              </div>

              {/* Progress Bar */}
              {userInvestment && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{((pkg.numberOfDays - getDaysRemaining(userInvestment.endDate)) / pkg.numberOfDays * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={((pkg.numberOfDays - getDaysRemaining(userInvestment.endDate)) / pkg.numberOfDays * 100)} className="h-2 bg-gray-200" />

                  {/* Watch Ads Button */}
                  <Button
                    onClick={() => watchAdMutation.mutate({ 
                      investmentId: userInvestment.id, 
                      packageData: pkg 
                    })}
                    disabled={!canWatchAd(userInvestment) || watchAdMutation.isPending}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      canWatchAd(userInvestment) 
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white" 
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {watchAdMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Loading Ad...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>📺 Watch Ads ({getAdWatchesRemaining(userInvestment)}/10)</span>
                        <span className="text-sm">
                          (+{Math.floor(pkg.rewardPerTask * 0.1)} {getCurrencyIcon(pkg.rewardCurrency)})</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleAdRewardContinue = () => {
    setAdRewardDialog({ open: false, reward: 0, currency: "usd", adsRemaining: 0 })
    queryClient.invalidateQueries({ queryKey: ["/api/user"] })
    refetchInvestments()
  }

  const activeInvestments = userInvestments?.investments?.filter(inv => 
    inv.isActive && new Date(inv.endDate) > new Date()
  ) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">💎 Investment Center</h1>
          <p className="text-blue-100 text-sm">
            Grow your wealth with premium investment plans
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Balance Display */}
        <Card className="bg-white rounded-2xl shadow-lg border-0">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">💰 Your Balances</h2>
            {activeTab === "own" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
                  <div className="text-xs text-gray-600 mb-1">Main USD</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(user.usdBalance, "usd")}</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">Main EGP</div>
                  <div className="text-lg font-bold text-purple-600">{formatCurrency(user.egpBalance, "egp")}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">🎯 Points</div>
                  <div className="text-lg font-bold text-blue-600">{user.points.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-xl border border-yellow-200">
                  <div className="text-xs text-gray-600 mb-1">🪙 Coins</div>
                  <div className="text-lg font-bold text-yellow-600">{user.coinBalance.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
                  <div className="text-xs text-gray-600 mb-1">Investment USD</div>
                  <div className="text-lg font-bold text-green-600">{formatCurrency(user.investmentUsdBalance || 0, "usd")}</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-200">
                  <div className="text-xs text-gray-600 mb-1">Investment EGP</div>
                  <div className="text-lg font-bold text-purple-600">{formatCurrency(user.investmentEgpBalance || 0, "egp")}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment Packages */}
        <Card className="bg-white rounded-2xl shadow-lg border-0">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="p-4 pb-0">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 h-auto rounded-xl">
                  <TabsTrigger value="own" className="py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-semibold">
                    💵 Real Money
                  </TabsTrigger>
                  <TabsTrigger value="points" className="py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-semibold">
                    🎯 Multi-Currency
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="own" className="p-4 pt-2 space-y-4">
                <div className="text-center text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="font-semibold text-blue-700 mb-1">💰 Real Money Investment</div>
                  These packages require deposits from your main wallet balance
                </div>
                <div className="grid gap-4">
                  {ownPackages?.packages.map((pkg) => (
                    <PackageCard key={pkg.id} package_={pkg} type="own" />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="points" className="p-4 pt-2 space-y-4">
                <div className="text-center text-sm text-gray-600 mb-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="font-semibold text-yellow-700 mb-1">🎯 Multi-Currency Investment</div>
                  These packages can be purchased with any available currency
                </div>
                <div className="grid gap-4">
                  {pointsPackages?.packages.map((pkg) => (
                    <PackageCard key={pkg.id} package_={pkg} type="points" />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({...confirmDialog, open})}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 text-center">🎯 Confirm Investment</DialogTitle>
            <DialogDescription className="text-gray-600 text-center">
              You are about to subscribe to <span className="font-semibold text-blue-600">{confirmDialog.package?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-700 mb-2">💰 Investment Cost:</p>
              <p className="text-2xl font-bold text-blue-600">
                {getCurrencyIcon(confirmDialog.currency)} {formatAmount(confirmDialog.required, confirmDialog.currency)}
              </p>
            </div>
            <div className={`rounded-xl p-4 border ${
              confirmDialog.balance >= confirmDialog.required 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <p className="text-sm font-medium text-gray-700 mb-2">💳 Your Balance:</p>
              <p className={`text-2xl font-bold ${
                confirmDialog.balance >= confirmDialog.required ? "text-green-600" : "text-red-600"
              }`}>
                {getCurrencyIcon(confirmDialog.currency)} {formatAmount(confirmDialog.balance, confirmDialog.currency)}
              </p>
            </div>

            {confirmDialog.package && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">📈 Investment Details:</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-semibold">⏰ {confirmDialog.package.numberOfDays} days</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Daily Reward:</span>
                    <div className="font-semibold text-green-600">
                      {getCurrencyIcon(confirmDialog.package.rewardCurrency)} {formatAmount(confirmDialog.package.rewardPerTask, confirmDialog.package.rewardCurrency)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-600 text-sm">💰 Total Return:</span>
                  <div className="font-bold text-green-600 text-lg">
                    {getCurrencyIcon(confirmDialog.package.rewardCurrency)} {formatAmount(confirmDialog.package.rewardPerTask * confirmDialog.package.numberOfDays, confirmDialog.package.rewardCurrency)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({...confirmDialog, open: false})}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmSubscription}
              disabled={confirmDialog.balance < confirmDialog.required || subscribeMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white flex-1 rounded-xl"
            >
              {subscribeMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : "✅ Confirm Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ad Reward Dialog */}
      <Dialog open={adRewardDialog.open} onOpenChange={(open) => setAdRewardDialog({...adRewardDialog, open})}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center text-green-600">🎉 Ad Reward Earned!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="text-6xl mb-4">💰</div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              +{adRewardDialog.reward} {getCurrencyIcon(adRewardDialog.currency)}
            </div>
            <p className="text-gray-600 mb-2">has been added to your balance!</p>
            <div className="text-sm text-gray-500">
              📺 Ads remaining today: {adRewardDialog.adsRemaining}/10
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAdRewardContinue}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl"
            >
              🚀 Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}