import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { User, WithdrawalRequest } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface WalletSectionProps {
  user: User
}

export function WalletSection({ user }: WalletSectionProps) {
  const [exchangeAmount, setExchangeAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawCurrency, setWithdrawCurrency] = useState("usd")
  const [withdrawMethod, setWithdrawMethod] = useState("bank")
  const [accountDetails, setAccountDetails] = useState("")

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastExchangeAmount, setLastExchangeAmount] = useState(0);
  const [lastExchangePoints, setLastExchangePoints] = useState(0);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [pendingExchange, setPendingExchange] = useState<{points: number, currency: string} | null>(null);

  const { data: withdrawalMethods } = useQuery({
    queryKey: ["/api/admin/withdrawal-methods"]
  })

  const { data: depositMethods } = useQuery({
    queryKey: ["/api/deposit-methods"]
  })

  const { data: exchangeRates } = useQuery({
    queryKey: ["/api/exchange-rates"]
  })

  const { data: userWithdrawals } = useQuery<{ requests: WithdrawalRequest[] }>({
    queryKey: ["/api/withdrawals/user", user.id],
    queryFn: () => apiRequest("GET", `/api/withdrawals/user/${user.id}`),
    enabled: !!user.id,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  const { data: userDeposits } = useQuery<{ requests: any[] }>({
    queryKey: ["/api/deposits/user", user.id],
    queryFn: () => apiRequest("GET", `/api/deposits/user/${user.id}`),
    enabled: !!user.id,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  const exchangeMutation = useMutation({
    mutationFn: ({ points, currency }: { points: number, currency: string }) =>
      apiRequest("POST", "/api/exchange", { userId: user.id, points, currency }),
    onSuccess: async (response: any) => {
      const data = response.json ? response.json() : response
      const amount = data.amount

      // Update local state immediately
      const updatedUser = {
        ...user,
        points: user.points - (pendingExchange?.points || 0),
        usdBalance: pendingExchange?.currency === "usd" ? user.usdBalance + amount : user.usdBalance,
        egpBalance: pendingExchange?.currency === "egp" ? user.egpBalance + amount : user.egpBalance,
      };

      // Update the query cache with new user data
      queryClient.setQueryData(["/api/user", user.telegramId], { user: updatedUser });
      queryClient.setQueryData(["/api/user"], { user: updatedUser });

      toast(`تم تحويل ${pendingExchange?.points.toLocaleString()} نقطة إلى ${formatCurrency(amount, pendingExchange?.currency as "usd" | "egp")} بنجاح!`)
      setExchangeAmount("")
      setShowExchangeModal(false)
      setPendingExchange(null)

      // Refresh data from server to ensure sync
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
      }, 100);
    },
    onError: (error: any) => {
      toast(error.message || "Exchange failed", "error")
      setShowExchangeModal(false)
      setPendingExchange(null)
    }
  })

  const handleExchangeClick = (currency: string) => {
    const points = parseInt(exchangeAmount)
    if (canExchange()) {
      setPendingExchange({ points, currency })
      setShowExchangeModal(true)
    }
  }

  const confirmExchange = () => {
    if (pendingExchange) {
      exchangeMutation.mutate(pendingExchange)
    }
  }

  const getExchangeAmount = (points: number, currency: string) => {
    if (!exchangeRates?.rates) {
      // Fallback to default rates
      if (currency === "usd") {
        return (points / 10000) // 10000 points = $1
      } else {
        return (points / 200) // 200 points = £1 EGP
      }
    }

    // Find the appropriate exchange rate
    const rate = exchangeRates.rates.find(r => 
      r.fromCurrency === "points" && r.toCurrency === currency && r.isActive
    );

    if (rate) {
      return points * rate.rate;
    }

    // Fallback to default rates
    if (currency === "usd") {
      return (points / 10000)
    } else {
      return (points / 200)
    }
  }

  const withdrawMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/withdrawals", {
        userId: user.id,
        amount: parseInt(withdrawAmount) * 100, // Convert to cents/piastres
        currency: withdrawCurrency,
        method: withdrawMethod,
        accountDetails: accountDetails
      }),
    onSuccess: async (response) => {
      const withdrawAmountCents = parseInt(withdrawAmount) * 100;

      // Update local state immediately - deduct the withdrawn amount
      const updatedUser = {
        ...user,
        usdBalance: withdrawCurrency === "usd" ? user.usdBalance - withdrawAmountCents : user.usdBalance,
        egpBalance: withdrawCurrency === "egp" ? user.egpBalance - withdrawAmountCents : user.egpBalance,
      };

      // Update the query cache with new user data
      queryClient.setQueryData(["/api/user", user.telegramId], { user: updatedUser });
      queryClient.setQueryData(["/api/user"], { user: updatedUser });

      toast("✅ تم إرسال طلب السحب بنجاح!")
      setWithdrawAmount("")
      setAccountDetails("")

      // Refresh withdrawal history and user data from server
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/user", user.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
      }, 100);

      // Show additional info
      setTimeout(() => {
        toast("📝 ستظهر عملية السحب في تاريخ العمليات أدناه")
      }, 1000)
    },
    onError: (error: any) => {
      toast(error.message || "فشل في إرسال طلب السحب", "error")
    }
  })

  const canExchange = () => {
    const amount = parseInt(exchangeAmount)
    return amount >= 500 && amount <= user.points
  }

  const canWithdraw = () => {
    const amount = parseInt(withdrawAmount)
    if (withdrawCurrency === "usd") {
      return amount >= 1 && user.usdBalance >= amount * 100
    } else {
      return amount >= 50 && user.egpBalance >= amount * 100
    }
  }

  const exchangeCurrency = withdrawCurrency;
  const exchangePoints = 500

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white px-3 py-1">🟡 في الانتظار</Badge>
      case "approved":
        return <Badge className="bg-green-500 text-white px-3 py-1">🟢 مُوافق عليه</Badge>
      case "rejected":
        return <Badge className="bg-red-500 text-white px-3 py-1">🔴 مرفوض</Badge>
      default:
        return <Badge className="bg-gray-500 text-white px-3 py-1">{status}</Badge>
    }
  }

    const [showDepositModal, setShowDepositModal] = useState(false);
    const [selectedDepositMethod, setSelectedDepositMethod] = useState<{
        name: string;
        description: string;
        minAmount: number;
        maxAmount: number;
        extraFieldLabel?: string;
        extraFieldType?: "text" | "email" | "file";
    } | null>(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositCurrency, setDepositCurrency] = useState("usd");
    const [depositType, setDepositType] = useState("investment");
    const [extraFieldValue, setExtraFieldValue] = useState("");

    const depositMutation = useMutation({
        mutationFn: () =>
            apiRequest("POST", "/api/deposits", {
                userId: user.id,
                amount: parseInt(depositAmount) * 100, // Convert to cents/piastres
                currency: depositCurrency,
                method: selectedDepositMethod?.name,
                depositType: depositType,
                accountDetails: extraFieldValue
            }),
        onSuccess: async (response) => {
            toast("✅ تم إرسال طلب الإيداع بنجاح!")
            setDepositAmount("")
            setExtraFieldValue("")
            setDepositType("investment")
            setShowDepositModal(false)
            setSelectedDepositMethod(null)

            // Refresh user data from server
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                queryClient.invalidateQueries({ queryKey: ["/api/user", user.telegramId] });
                queryClient.invalidateQueries({ queryKey: ["/api/deposits/user", user.id] });
            }, 100);

            // Show additional info
            setTimeout(() => {
                toast("📝 ستظهر عملية الإيداع في تاريخ العمليات أدناه")
            }, 1000)
        },
        onError: (error: any) => {
            toast(error.message || "فشل في إرسال طلب الإيداع", "error")
        }
    })

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Wallet 💰</h2>
        <p className="text-gray-600">Manage your earnings and transactions</p>
      </div>

      {/* Current Balances */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-6">
        <div className="text-center">
          <div className="text-sm text-white/80 mb-2">Available Balance</div>
          <div className="text-3xl font-bold mb-4">
            {user.points.toLocaleString()} <span className="text-xl">points</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold">{formatCurrency(user.usdBalance, "usd")}</div>
              <div className="text-white/80 text-sm">USD</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{formatCurrency(user.egpBalance, "egp")}</div>
              <div className="text-white/80 text-sm">Egyptian Pounds</div>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Points */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          p Points
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points to Exchange</label>
            <Input
              type="number"
              placeholder="Enter AD points p (min 500)"
              value={exchangeAmount}
              onChange={(e) => setExchangeAmount(e.target.value)}
              min="500"
              max={user.points}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleExchangeClick("usd")}
              disabled={!canExchange() || exchangeMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Convert to USD
            </Button>
            <Button
              onClick={() => handleExchangeClick("egp")}
              disabled={!canExchange() || exchangeMutation.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              Convert to EGP
            </Button>
          </div>
          <div className="text-sm text-gray-500 text-center">
            {exchangeRates?.rates ? (
              <>
                Exchange Rate: {exchangeRates.rates.find(r => r.fromCurrency === "AD points" && r.toCurrency === "usd")?.rate ? 
                  `${Math.round(1 / (exchangeRates.rates.find(r => r.fromCurrency === "AD points" && r.toCurrency === "usd")?.rate || 0.0001))} points = $1 USD` : 
                  "10000 AD points = $1 USD"} | {exchangeRates.rates.find(r => r.fromCurrency === "points" && r.toCurrency === "egp")?.rate ? 
                  `${Math.round(1 / (exchangeRates.rates.find(r => r.fromCurrency === "AD points" && r.toCurrency === "egp")?.rate || 0.005))} points = £1 EGP` : 
                  "200 AD points = £1 EGP"}
              </>
            ) : (
              "Exchange Rate: 10000 AD points = $1 USD | 200 points = £1 EGP"
            )}
          </div>
        </div>
      </div>

      {/* Deposit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Deposit Money
        </h3>
        
        {!depositMethods?.methods || depositMethods.methods.filter(method => method.isActive).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p>لا توجد طرق إيداع متاحة حالياً</p>
            <p className="text-xs text-gray-400 mt-1">يرجى المحاولة لاحقاً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {depositMethods.methods
              .filter(method => method.isActive)
              .map((method) => (
                <Button 
                  key={method.id}
                  variant="outline" 
                  className="p-4 h-auto flex flex-col items-center space-y-2 hover:bg-blue-50 hover:border-blue-200"
                  onClick={() => {
                    setSelectedDepositMethod({
                      name: method.name,
                      description: method.description || "",
                      minAmount: method.minAmount,
                      maxAmount: method.maxAmount,
                      extraFieldLabel: method.extraFieldLabel || undefined,
                      extraFieldType: method.extraFieldType as "text" | "email" | "file" || "text"
                    });
                    setShowDepositModal(true);
                  }}
                >
                  {method.image ? (
                    <img src={method.image} alt={method.name} className="w-6 h-6" />
                  ) : (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-center">{method.name}</span>
                  {method.description && (
                    <span className="text-xs text-gray-500 text-center">{method.description}</span>
                  )}
                </Button>
              ))}
          </div>
        )}
      </div>

      {/* Withdraw */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          Withdraw Funds
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount</label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1"
              />
              <Select value={withdrawCurrency} onValueChange={setWithdrawCurrency}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD</SelectItem>
                  <SelectItem value="egp">EGP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Method</label>
            <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {withdrawalMethods?.methods?.filter(method => method.isActive).map((method) => (
                  <SelectItem key={method.id} value={method.name.toLowerCase().replace(/\s+/g, '_')}>
                    {method.name}
                  </SelectItem>
                )) || (
                  <>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {withdrawMethod === "bank" ? "Bank Account Details (Account Number, Bank Name)" :
               withdrawMethod === "paypal" ? "PayPal Email Address" :
               withdrawMethod === "vodafone" ? "Vodafone Cash Number" :
               withdrawMethod === "crypto" ? "Wallet Address" :
               "Account Details"}
            </label>
            <Input
              placeholder={
                withdrawMethod === "bank" ? "Account: 1234567890, Bank: ABC Bank" :
                withdrawMethod === "paypal" ? "your.email@example.com" :
                withdrawMethod === "vodafone" ? "01XXXXXXXXX" :
                withdrawMethod === "crypto" ? "Your wallet address" :
                "Enter account details"
              }
              value={accountDetails}
              onChange={(e) => setAccountDetails(e.target.value)}
            />
          </div>
          <Button
            onClick={() => withdrawMutation.mutate()}
            disabled={!canWithdraw() || withdrawMutation.isPending || !accountDetails.trim()}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            Request Withdrawal
          </Button>
          <div className="text-sm text-gray-500 text-center">
            Minimum withdrawal: $1 USD | £50 EGP | Processing time: 1-3 business days
          </div>
        </div>
      </div>

      {/* Deposit History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Deposit History
        </h3>

        {!userDeposits?.requests || userDeposits.requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p>لا توجد طلبات إيداع حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userDeposits.requests
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((request) => (
              <div key={request.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-gray-800">
                        {formatCurrency(request.amount, request.currency as "usd" | "egp")}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span>طريقة الإيداع: {request.method}</span>
                      </div>

                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>نوع الإيداع: {request.depositType === "main" ? "المحفظة الرئيسية" : "محفظة الاستثمار"}</span>
                      </div>

                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-6 4h6" />
                        </svg>
                        <span>التاريخ: {new Date(request.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>

                      {request.accountDetails && (
                        <div className="flex items-start mt-2">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-xs text-gray-500">تفاصيل الإيداع:</span>
                            <p className="text-sm text-gray-700 break-words">
                              {request.accountDetails}
                            </p>
                          </div>
                        </div>
                      )}

                      {request.transactionProof && (
                        <div className="flex items-start mt-2">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-xs text-gray-500">إثبات العملية:</span>
                            <p className="text-sm text-blue-600 break-words">
                              {request.transactionProof}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status description */}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-gray-500">
                    {request.status === "pending" && "🕒 طلب الإيداع قيد المراجعة، سيتم التواصل معك قريباً"}
                    {request.status === "approved" && "✅ تم الموافقة على الإيداع وإضافة المبلغ إلى رصيدك"}
                    {request.status === "rejected" && "❌ تم رفض طلب الإيداع، يرجى المحاولة مرة أخرى"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
          </svg>
          Withdrawal History
        </h3>

        {!userWithdrawals?.requests || userWithdrawals.requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
            </svg>
            <p>لا توجد طلبات سحب حتى الآن</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userWithdrawals.requests
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((request) => (
              <div key={request.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-gray-800">
                        {formatCurrency(request.amount, request.currency as "usd" | "egp")}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>طريقة السحب: {request.method}</span>
                      </div>

                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-6 4h6" />
                        </svg>
                        <span>التاريخ: {new Date(request.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>

                      {request.accountDetails && (
                        <div className="flex items-start mt-2">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-xs text-gray-500">تفاصيل الحساب:</span>
                            <p className="text-sm text-gray-700 break-words">
                              {request.accountDetails}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status description */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {request.status === "pending" && "🕒 طلبك قيد المراجعة، سيتم التواصل معك قريباً"}
                    {request.status === "approved" && "✅ تم الموافقة على طلبك وسيتم التحويل خلال 1-3 أيام عمل"}
                    {request.status === "rejected" && "❌ تم رفض الطلب، تم إرجاع المبلغ إلى حسابك"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Exchange Confirmation Modal */}
      {showExchangeModal && pendingExchange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">تأكيد التحويل</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>سيتم خصم: <span className="font-semibold text-red-600">{pendingExchange.points.toLocaleString()} نقطة</span></p>
                  <p>ستحصل على: <span className="font-semibold text-green-600">
                    {formatCurrency(getExchangeAmount(pendingExchange.points, pendingExchange.currency) * 100, pendingExchange.currency as "usd" | "egp")}
                  </span></p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setShowExchangeModal(false)
                    setPendingExchange(null)
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={exchangeMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={confirmExchange}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  disabled={exchangeMutation.isPending}
                >
                  {exchangeMutation.isPending ? "جاري التحويل..." : "تأكيد"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        type="exchange"
        reward={0}
        message={`تم تحويل ${lastExchangePoints.toLocaleString()} نقطة إلى ${formatCurrency(lastExchangeAmount / 100, exchangeCurrency)} بنجاح`}
        onContinue={() => {
          setShowConfirmation(false);
        }}
        continueButtonText="قبول"
      />

      {/* Deposit Modal */}
      {showDepositModal && selectedDepositMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">إيداع عبر {selectedDepositMethod.name}</h3>
                {selectedDepositMethod.description && (
                  <p className="text-sm text-gray-600 mb-4">{selectedDepositMethod.description}</p>
                )}
              </div>

              <div className="space-y-4">
                {/* Amount and Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المبلغ والعملة</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1"
                      min={selectedDepositMethod.minAmount / 100}
                      max={selectedDepositMethod.maxAmount / 100}
                    />
                    <Select value={depositCurrency} onValueChange={setDepositCurrency}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD 💵</SelectItem>
                        <SelectItem value="egp">EGP 💰</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    الحد الأدنى: {formatCurrency(selectedDepositMethod.minAmount, depositCurrency as "usd" | "egp")} | 
                    الحد الأقصى: {formatCurrency(selectedDepositMethod.maxAmount, depositCurrency as "usd" | "egp")}
                  </div>
                </div>

                {/* Extra Field */}
                {selectedDepositMethod.extraFieldLabel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedDepositMethod.extraFieldLabel}
                    </label>
                    {selectedDepositMethod.extraFieldType === "email" ? (
                      <Input
                        type="email"
                        placeholder="أدخل البريد الإلكتروني"
                        value={extraFieldValue}
                        onChange={(e) => setExtraFieldValue(e.target.value)}
                      />
                    ) : selectedDepositMethod.extraFieldType === "file" ? (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setExtraFieldValue(file.name)
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500">يرجى رفع صورة واضحة للإيصال أو الدليل</p>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder="أدخل التفاصيل المطلوبة"
                        value={extraFieldValue}
                        onChange={(e) => setExtraFieldValue(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {/* Deposit Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الإيداع</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={depositType === "main" ? "default" : "outline"}
                      className="h-auto p-3 flex flex-col items-center space-y-1"
                      onClick={() => setDepositType("main")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-sm">المحفظة الرئيسية</span>
                      <span className="text-xs text-gray-500">للسحب المباشر</span>
                    </Button>
                    <Button
                      type="button"
                      variant={depositType === "investment" ? "default" : "outline"}
                      className="h-auto p-3 flex flex-col items-center space-y-1"
                      onClick={() => setDepositType("investment")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm">محفظة الاستثمار</span>
                      <span className="text-xs text-gray-500">للاستثمار فقط</span>
                    </Button>
                  </div>
                </div>

                {/* Validation */}
                {depositAmount && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <p>📝 ملخص طلب الإيداع:</p>
                      <p>• المبلغ: {formatCurrency(parseInt(depositAmount) * 100, depositCurrency as "usd" | "egp")}</p>
                      <p>• الطريقة: {selectedDepositMethod.name}</p>
                      <p>• الوجهة: {depositType === "main" ? "المحفظة الرئيسية" : "محفظة الاستثمار"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowDepositModal(false)
                    setSelectedDepositMethod(null)
                    setDepositAmount("")
                    setExtraFieldValue("")
                    setDepositType("investment")
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={depositMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={() => depositMutation.mutate()}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={
                    !depositAmount || 
                    depositMutation.isPending || 
                    (!extraFieldValue && selectedDepositMethod.extraFieldLabel) ||
                    parseInt(depositAmount) < (selectedDepositMethod.minAmount / 100) ||
                    parseInt(depositAmount) > (selectedDepositMethod.maxAmount / 100)
                  }
                >
                  {depositMutation.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}