import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DepositMethod, WithdrawalMethod, ExchangeRate } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

export function WalletManagement() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [newDepositMethod, setNewDepositMethod] = useState({
    name: "",
    description: "",
    image: "",
    extraFieldType: "text",
    extraFieldLabel: "",
    minAmount: 0,
    maxAmount: 1000000,
    isActive: true
  })

  const [newWithdrawalMethod, setNewWithdrawalMethod] = useState({
    name: "",
    description: "",
    minAmount: 0,
    maxAmount: 1000000,
    isActive: true
  })

  const [newExchangeRate, setNewExchangeRate] = useState({
    fromCurrency: "points",
    toCurrency: "usd",
    rate: 0.0001,
    isActive: true
  })

  const { data: depositMethods } = useQuery<{ methods: DepositMethod[] }>({
    queryKey: ["/api/admin/deposit-methods"]
  })

  const { data: withdrawalMethods } = useQuery<{ methods: WithdrawalMethod[] }>({
    queryKey: ["/api/admin/withdrawal-methods"]
  })

  // Exchange Rates Management
  const { data: exchangeRates } = useQuery<{ rates: ExchangeRate[] }>({
    queryKey: ["/api/admin/exchange-rates"]
  })

  // Deposit Methods Mutations
  const createDepositMethodMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/deposit-methods", newDepositMethod),
    onSuccess: () => {
      toast("Deposit method created successfully!")
      setNewDepositMethod({ name: "", description: "", image: "", extraFieldType: "text", extraFieldLabel: "", minAmount: 0, maxAmount: 1000000, isActive: true })
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-methods"] })
      queryClient.invalidateQueries({ queryKey: ["/api/deposit-methods"] })
    },
    onError: () => {
      toast("Failed to create deposit method", "error")
    }
  })

  const deleteDepositMethodMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/deposit-methods/${id}`),
    onSuccess: () => {
      toast("Deposit method deleted!")
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-methods"] })
    },
    onError: () => {
      toast("Failed to delete deposit method", "error")
    }
  })

  // Withdrawal Methods Mutations
  const createWithdrawalMethodMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/withdrawal-methods", newWithdrawalMethod),
    onSuccess: () => {
      toast("Withdrawal method created successfully!")
      setNewWithdrawalMethod({ name: "", description: "", minAmount: 0, maxAmount: 1000000, isActive: true })
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawal-methods"] })
    },
    onError: () => {
      toast("Failed to create withdrawal method", "error")
    }
  })

  const deleteWithdrawalMethodMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/withdrawal-methods/${id}`),
    onSuccess: () => {
      toast("Withdrawal method deleted!")
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawal-methods"] })
    },
    onError: () => {
      toast("Failed to delete withdrawal method", "error")
    }
  })

  const createExchangeRateMutation = useMutation({
    mutationFn: (rateData: any) => apiRequest("POST", "/api/admin/exchange-rates", rateData),
    onSuccess: () => {
      toast("Exchange rate created successfully!")
      setNewExchangeRate({ fromCurrency: "points", toCurrency: "usd", rate: 0.0001, isActive: true })
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] })
    },
    onError: (error: any) => {
      toast(error.message || "Failed to create exchange rate", "error")
    }
  })

  const updateExchangeRateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number, updates: any }) => 
      apiRequest("PUT", `/api/admin/exchange-rates/${id}`, updates),
    onSuccess: () => {
      toast("Exchange rate updated successfully!")
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] })
    },
    onError: (error: any) => {
      toast(error.message || "Failed to update exchange rate", "error")
    }
  })

  const deleteExchangeRateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/exchange-rates/${id}`),
    onSuccess: () => {
      toast("Exchange rate deleted successfully!")
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] })
    },
    onError: (error: any) => {
      toast(error.message || "Failed to delete exchange rate", "error")
    }
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Wallet Management</h2>

      {/* Deposit Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Deposit Methods</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600">Add Deposit Method</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Deposit Method</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Method Name (e.g., Bank Transfer, PayPal)"
                  value={newDepositMethod.name}
                  onChange={(e) => setNewDepositMethod(prev => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={newDepositMethod.description}
                  onChange={(e) => setNewDepositMethod(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  placeholder="Image URL (optional)"
                  value={newDepositMethod.image}
                  onChange={(e) => setNewDepositMethod(prev => ({ ...prev, image: e.target.value }))}
                />
                <Select
                  value={newDepositMethod.extraFieldType}
                  onValueChange={(value) => setNewDepositMethod(prev => ({ ...prev, extraFieldType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Extra Field Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="email">Email Input</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Extra Field Label (e.g., 'Transaction ID', 'Upload Receipt')"
                  value={newDepositMethod.extraFieldLabel}
                  onChange={(e) => setNewDepositMethod(prev => ({ ...prev, extraFieldLabel: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Min Amount"
                    value={newDepositMethod.minAmount || ""}
                    onChange={(e) => setNewDepositMethod(prev => ({ ...prev, minAmount: parseInt(e.target.value) || 0 }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max Amount"
                    value={newDepositMethod.maxAmount || ""}
                    onChange={(e) => setNewDepositMethod(prev => ({ ...prev, maxAmount: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newDepositMethod.isActive}
                    onCheckedChange={(checked) => setNewDepositMethod(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-sm">Active</span>
                </div>
                <Button 
                  onClick={() => createDepositMethodMutation.mutate()}
                  disabled={createDepositMethodMutation.isPending}
                  className="w-full"
                >
                  Create Method
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {depositMethods?.methods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-gray-600">{method.description}</p>
                  <p className="text-xs text-gray-500">
                    Range: ${method.minAmount} - ${method.maxAmount} | 
                    Status: {method.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteDepositMethodMutation.mutate(method.id)}
                  disabled={deleteDepositMethodMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Withdrawal Methods</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600">Add Withdrawal Method</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Withdrawal Method</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Method Name (e.g., Bank Transfer, PayPal)"
                  value={newWithdrawalMethod.name}
                  onChange={(e) => setNewWithdrawalMethod(prev => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={newWithdrawalMethod.description}
                  onChange={(e) => setNewWithdrawalMethod(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Min Amount"
                    value={newWithdrawalMethod.minAmount || ""}
                    onChange={(e) => setNewWithdrawalMethod(prev => ({ ...prev, minAmount: parseInt(e.target.value) || 0 }))}
                  />
                  <Input
                    type="number"
                    placeholder="Max Amount"
                    value={newWithdrawalMethod.maxAmount || ""}
                    onChange={(e) => setNewWithdrawalMethod(prev => ({ ...prev, maxAmount: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newWithdrawalMethod.isActive}
                    onCheckedChange={(checked) => setNewWithdrawalMethod(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-sm">Active</span>
                </div>
                <Button 
                  onClick={() => createWithdrawalMethodMutation.mutate()}
                  disabled={createWithdrawalMethodMutation.isPending}
                  className="w-full"
                >
                  Create Method
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {withdrawalMethods?.methods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-gray-600">{method.description}</p>
                  <p className="text-xs text-gray-500">
                    Range: ${method.minAmount} - ${method.maxAmount} | 
                    Status: {method.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteWithdrawalMethodMutation.mutate(method.id)}
                  disabled={deleteWithdrawalMethodMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exchange Rates Management</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600">Add Exchange Rate</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Exchange Rate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select
                  value={newExchangeRate.fromCurrency}
                  onValueChange={(value) => setNewExchangeRate(prev => ({ ...prev, fromCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={newExchangeRate.toCurrency}
                  onValueChange={(value) => setNewExchangeRate(prev => ({ ...prev, toCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="egp">Egyptian Pounds</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Exchange Rate (1 point = ? {newExchangeRate.toCurrency.toUpperCase()})
                  </label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="0.0001"
                    value={newExchangeRate.rate || ""}
                    onChange={(e) => setNewExchangeRate(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: 0.0001 means 10,000 points = 1 {newExchangeRate.toCurrency.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rate-active"
                    checked={newExchangeRate.isActive}
                    onCheckedChange={(checked) => setNewExchangeRate(prev => ({ ...prev, isActive: !!checked }))}
                  />
                  <label htmlFor="rate-active" className="text-sm font-medium">Active</label>
                </div>

                <Button
                  onClick={() => createExchangeRateMutation.mutate(newExchangeRate)}
                  disabled={createExchangeRateMutation.isPending || !newExchangeRate.fromCurrency || !newExchangeRate.toCurrency || newExchangeRate.rate <= 0}
                  className="w-full"
                >
                  {createExchangeRateMutation.isPending ? "Creating..." : "Create Exchange Rate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!exchangeRates?.rates || exchangeRates.rates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No exchange rates configured</p>
              <p className="text-sm text-gray-400 mt-2">Add exchange rates to control point conversion</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exchangeRates.rates.map((rate: any) => (
                <div key={rate.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h4 className="font-medium text-lg">
                          {rate.fromCurrency.toUpperCase()} → {rate.toCurrency.toUpperCase()}
                        </h4>
                        <Badge variant={rate.isActive ? "default" : "secondary"}>
                          {rate.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Rate: <span className="font-mono">{rate.rate}</span> {rate.toCurrency.toUpperCase()} per point</p>
                        <p>Equivalent: <span className="font-semibold">{Math.round(1/parseFloat(rate.rate)).toLocaleString()} points = 1 {rate.toCurrency.toUpperCase()}</span></p>
                        {rate.createdAt && (
                          <p>Created: {new Date(rate.createdAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateExchangeRateMutation.mutate({ 
                          id: rate.id, 
                          updates: { isActive: !rate.isActive } 
                        })}
                        disabled={updateExchangeRateMutation.isPending}
                      >
                        {rate.isActive ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteExchangeRateMutation.mutate(rate.id)}
                        disabled={deleteExchangeRateMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}