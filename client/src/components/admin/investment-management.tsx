import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InvestmentPackage, DepositRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export function InvestmentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newPackage, setNewPackage] = useState<Partial<InvestmentPackage>>({
    title: "",
    type: "points",
    price: 0,
    numberOfDays: 7,
    rewardPerTask: 100,
    rewardCurrency: "points",
    isActive: true,
  });

  const { data: packages, isLoading, isError, error } = useQuery<{ packages: InvestmentPackage[] }>({
    queryKey: ["/api/admin/investment-packages"],
    queryFn: () => apiRequest("GET", "/api/admin/investment-packages"),
  });

  const { 
    data: depositRequests, 
    isLoading: isLoadingDeposits, 
    isError: isErrorDeposits,
    error: errorDeposits
  } = useQuery<{ requests: (DepositRequest & { user: any })[] }>({
    queryKey: ["/api/deposits"],
    queryFn: () => apiRequest("GET", "/api/deposits"),
  });

  const createPackageMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/investment-packages", newPackage),
    onSuccess: () => {
      toast("Investment package created successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investment-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setNewPackage({
        title: "",
        type: "points",
        price: 0,
        numberOfDays: 7,
        rewardPerTask: 100,
        rewardCurrency: "points",
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast(error.message || "Failed to create investment package", "error");
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/investment-packages/${id}`),
    onSuccess: () => {
      toast("Investment package deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investment-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
    },
    onError: (error: any) => {
      toast(error.message || "Failed to delete investment package", "error");
    },
  });

  const togglePackageStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PUT", `/api/admin/investment-packages/${id}`, { isActive }),
    onSuccess: () => {
      toast("Package status updated!");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investment-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
    },
    onError: (error: any) => {
      toast(error.message || "Failed to update package status", "error");
    },
  });

  const approveDepositMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/deposits/${id}/approve`),
    onSuccess: () => {
      toast("Deposit request approved!");
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (error: any) => {
      toast(error.message || "Failed to approve deposit", "error");
    },
  });

  const rejectDepositMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/deposits/${id}/reject`),
    onSuccess: () => {
      toast("Deposit request rejected!");
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });
    },
    onError: (error: any) => {
      toast(error.message || "Failed to reject deposit", "error");
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Investment & Deposit Management</h2>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">Investment Packages</TabsTrigger>
          <TabsTrigger value="deposits">Deposit Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Investment Packages</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-500 hover:bg-green-600">Add Package</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Investment Package</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Package Title"
                    value={newPackage.title}
                    onChange={(e) => setNewPackage((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <Select
                    value={newPackage.type}
                    onValueChange={(value) => setNewPackage((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Package Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points Investment</SelectItem>
                      <SelectItem value="own">Own Investment (Real Money)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Price</label>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={newPackage.price ?? ""}
                        onChange={(e) =>
                          setNewPackage((prev) => ({ ...prev, price: parseInt(e.target.value) || 0 }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {newPackage.type === "own" ? "In cents (100 = $1)" : "In points/coins"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Duration (Days)</label>
                      <Input
                        type="number"
                        placeholder="Days"
                        value={newPackage.numberOfDays ?? ""}
                        onChange={(e) =>
                          setNewPackage((prev) => ({ ...prev, numberOfDays: parseInt(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Reward per Task</label>
                      <Input
                        type="number"
                        placeholder="Reward"
                        value={newPackage.rewardPerTask ?? ""}
                        onChange={(e) =>
                          setNewPackage((prev) => ({ ...prev, rewardPerTask: parseInt(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Reward Currency</label>
                      <Select
                        value={newPackage.rewardCurrency}
                        onValueChange={(value) => setNewPackage((prev) => ({ ...prev, rewardCurrency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="coin">Coins</SelectItem>
                          <SelectItem value="usd">USD</SelectItem>
                          <SelectItem value="egp">EGP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newPackage.isActive}
                      onCheckedChange={(checked) => setNewPackage((prev) => ({ ...prev, isActive: checked }))}
                    />
                    <span className="text-sm">Active</span>
                  </div>
                  <Button
                    onClick={() => createPackageMutation.mutate()}
                    disabled={createPackageMutation.isPending || !newPackage.title}
                    className="w-full"
                  >
                    Create Package
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading && <p>Loading investment packages...</p>}
          {isError && <p className="text-red-600">Error loading: {(error as Error).message}</p>}

          {!isLoading && !isError && packages?.packages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No investment packages</h3>
              <p className="text-gray-600">Create your first investment package to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {packages?.packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{pkg.title}</h4>
                          <Badge variant={pkg.type === "own" ? "default" : "secondary"}>
                            {pkg.type === "own" ? "Real Money" : "Points/Coins"}
                          </Badge>
                          <Badge variant={pkg.isActive ? "default" : "destructive"}>
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Price:</span>
                            <br />
                            {pkg.type === "own" ? formatCurrency(pkg.price, "usd") : `${pkg.price.toLocaleString()}`}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>
                            <br />
                            {pkg.numberOfDays} days
                          </div>
                          <div>
                            <span className="font-medium">Reward:</span>
                            <br />
                            {pkg.rewardPerTask} {pkg.rewardCurrency}
                          </div>
                          <div>
                            <span className="font-medium">Per:</span>
                            <br />
                            Task completed
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={pkg.isActive}
                          onCheckedChange={(checked) =>
                            togglePackageStatus.mutate({ id: pkg.id, isActive: checked })
                          }
                          disabled={togglePackageStatus.isPending}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePackageMutation.mutate(pkg.id)}
                          disabled={deletePackageMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deposits" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Deposit Requests</h3>
            <Badge variant="outline">
              {depositRequests?.requests?.filter((req) => req.status === "pending").length || 0} Pending
            </Badge>
          </div>

          {isLoadingDeposits ? (
            <p>Loading deposit requests...</p>
          ) : isErrorDeposits ? (
            <p className="text-red-600">Error loading deposit requests: {(errorDeposits as Error).message}</p>
          ) : !depositRequests?.requests?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deposit requests</h3>
              <p className="text-gray-600">Deposit requests will appear here when users submit them</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {depositRequests.requests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {req.user?.firstName} (@{req.user?.username})
                          </h4>
                          <Badge variant={req.depositType === "investment" ? "default" : "secondary"}>
                            {req.depositType === "investment" ? "Investment" : "Main Wallet"}
                          </Badge>
                          <Badge
                            variant={
                              req.status === "approved"
                                ? "default"
                                : req.status === "rejected"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Amount:</span>
                            <br />
                            {formatCurrency(req.amount, req.currency)}
                          </div>
                          <div>
                            <span className="font-medium">Method:</span>
                            <br />
                            {req.method}
                          </div>
                          <div>
                            <span className="font-medium">Account:</span>
                            <br />
                            {req.accountDetails || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>
                            <br />
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {req.transactionProof && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-600">Proof: </span>
                            <span className="text-sm text-blue-600">{req.transactionProof}</span>
                          </div>
                        )}
                      </div>
                      {req.status === "pending" && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => approveDepositMutation.mutate(req.id)}
                            disabled={approveDepositMutation.isPending}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectDepositMutation.mutate(req.id)}
                            disabled={rejectDepositMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}