"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CupSoda,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock3,
  Thermometer,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatRelativeTime, parseCustomDateFormat } from "@/lib/date-utils";

interface OverviewTabProps {
  machine: any;
  transactionMetrics: any;
}

export function OverviewTab({ machine, transactionMetrics }: OverviewTabProps) {
  // Fix the lastRefillTime calculation
  const lastRefillTime = useMemo(() => {
    if (!machine || !machine.lastFulfilled) return null;

    const lastRefillDate = parseCustomDateFormat(machine.lastFulfilled);
    if (!lastRefillDate || isNaN(lastRefillDate.getTime())) {
      console.error("Invalid date:", machine.lastFulfilled);
      return null;
    }

    const formattedDate = `${lastRefillDate.getDate().toString().padStart(2, "0")}/${(lastRefillDate.getMonth() + 1).toString().padStart(2, "0")}/${lastRefillDate.getFullYear()}`;
    const formattedTime = lastRefillDate.toLocaleTimeString();
    const timeAgo = formatRelativeTime(lastRefillDate);

    return {
      date: lastRefillDate,
      formattedDate,
      formattedTime,
      timeAgo,
    };
  }, [machine]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Summary Card */}
        <Card className="border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CupSoda className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-2xl font-bold">
                {transactionMetrics.totalCups} cups
              </span>
            </div>
            <div className="flex items-center mt-2">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-xl font-medium">
                ₹{transactionMetrics.totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total sales to date
            </p>
          </CardContent>
        </Card>

        {/* Transaction Status Card */}
        <Card className="border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Transaction Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.paidTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <Clock3 className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.activeTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.canceledTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Canceled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Refill Card - FIXED */}
        <Card className="border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Refilled</CardTitle>
          </CardHeader>
          <CardContent>
            {lastRefillTime ? (
              <>
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2 text-purple-500" />
                  <span className="text-xl font-bold">
                    {lastRefillTime.formattedDate}
                  </span>
                </div>
                <p className="text-sm mt-2">
                  <span className="font-medium">{lastRefillTime.timeAgo}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {lastRefillTime.formattedTime}
                </p>
              </>
            ) : (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                <span className="text-xl font-bold">No refill data</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Last canister refill
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div
                className={`h-4 w-4 rounded-full mr-2 ${machine.status === "online" ? "bg-green-500" : "bg-gray-400"}`}
              ></div>
              <span className="text-2xl font-bold">
                {machine.status === "online" ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Temperature Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Thermometer className="h-5 w-5 mr-2 text-orange-500" />
              <span className="text-2xl font-bold">
                {machine.temperature}°C
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Optimal range: 2°C - 8°C
            </p>
          </CardContent>
        </Card>

        {/* Canister Level Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Canister Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  {machine.canisterLevel}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {machine.canisterLevel < 20
                    ? "Low"
                    : machine.canisterLevel < 50
                      ? "Medium"
                      : "Good"}
                </span>
              </div>
              <Progress value={machine.canisterLevel} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {machine.canisterLevel < 20
                ? "Refill needed soon"
                : machine.canisterLevel < 50
                  ? "Monitor levels"
                  : "Level is good"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Daily cup sales for the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {transactionMetrics.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={transactionMetrics.dailySales}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="cups"
                    name="Cups Sold"
                    fill="#4ade80"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Sales Data</h3>
                  <p className="text-muted-foreground">
                    No sales have been recorded for this machine yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Machine Description */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{machine.description}</p>
        </CardContent>
      </Card>

      {/* Replenishment Status */}
      {machine.replenishmentOrder && (
        <Card
          className={
            machine.replenishmentOrder.status === "pending"
              ? "border-yellow-500"
              : "border-green-500"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle>Replenishment Status</CardTitle>
            <CardDescription>
              Current replenishment order status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4">
              <Badge
                variant={
                  machine.replenishmentOrder.status === "pending"
                    ? "outline"
                    : "default"
                }
                className="mr-2"
              >
                {machine.replenishmentOrder.status}
              </Badge>
              {machine.replenishmentOrder.eta && (
                <span className="text-sm">
                  ETA:{" "}
                  {new Date(machine.replenishmentOrder.eta).toLocaleString()}
                </span>
              )}
            </div>

            {machine.deliveryBoy && (
              <div className="border rounded-md p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Delivery Agent</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Name:</div>
                  <div>{machine.deliveryBoy.name}</div>
                  <div>Location:</div>
                  <div>{machine.deliveryBoy.location}</div>
                  <div>ETA:</div>
                  <div>
                    {machine.deliveryBoy.eta
                      ? new Date(machine.deliveryBoy.eta).toLocaleTimeString()
                      : "Unknown"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
