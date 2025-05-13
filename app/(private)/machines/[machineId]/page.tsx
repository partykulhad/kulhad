"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  MapPin,
  Thermometer,
  Droplet,
  Calendar,
  Settings,
  Truck,
  History,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CupSoda,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock3,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Replace the parseCustomDateFormat function with this improved version
function parseCustomDateFormat(dateString: string | number | Date) {
  if (!dateString) return null;

  try {
    // Handle the format "DD-MM-YYYY hh:mm:ss AM/PM"
    const parts = dateString.toString().split(" ");
    const datePart = parts[0];
    const timePart = parts[1];
    const periodPart = parts[2]; // AM or PM

    // Parse date parts (DD-MM-YYYY)
    const [day, month, year] = datePart.split("-").map(Number);

    // Parse time parts (hh:mm:ss)
    let [hours, minutes, seconds] = timePart.split(":").map(Number);

    // Convert 12-hour format to 24-hour format if needed
    if (periodPart && periodPart.toUpperCase() === "PM" && hours < 12) {
      hours += 12;
    } else if (
      periodPart &&
      periodPart.toUpperCase() === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }

    // Create date object (months are 0-indexed in JavaScript)
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error("Error parsing date:", error, dateString);
    // Fallback to standard date parsing
    return new Date(dateString);
  }
}

// Replace the formatRelativeTime function with this improved version
function formatRelativeTime(date: Date) {
  if (!date) return null;

  const now = new Date();

  // Ensure we're working with valid dates
  if (isNaN(date.getTime()) || isNaN(now.getTime())) {
    return "Unknown time";
  }

  // Calculate time difference in milliseconds
  const diffTime = now.getTime() - date.getTime();

  // Convert to seconds, minutes, hours, days
  const diffSeconds = Math.floor(diffTime / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Create a human-readable time ago string
  if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else {
    return "Just now";
  }
}

export default function MachineDetailsPage() {
  const router = useRouter();
  const { machineId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("week"); // week, month, year

  // Get all machines and find the one that matches the ID
  const machines = useQuery(api.machines.list) || [];
  const machine = machines.find((m) => m.id === machineId);

  // Get machine data history
  const machineData =
    useQuery(
      api.machines.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Get replenishment requests for this machine
  const requests =
    useQuery(
      api.requests.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Get transactions for this machine
  const transactions =
    useQuery(
      api.transactions.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Calculate transaction metrics
  const transactionMetrics = useMemo(() => {
    if (!transactions.length) {
      return {
        totalCups: 0,
        totalAmount: 0,
        paidTransactions: 0,
        activeTransactions: 0,
        canceledTransactions: 0,
        paidAmount: 0,
        dailySales: [],
        monthlySales: [],
        statusDistribution: [],
      };
    }

    // Filter transactions by status
    const paidTxs = transactions.filter((tx) => tx.status === "paid");
    const activeTxs = transactions.filter((tx) => tx.status === "active");
    const canceledTxs = transactions.filter((tx) => tx.status === "canceled");

    // Calculate totals
    const totalCups = paidTxs.reduce((sum, tx) => sum + tx.cups, 0);
    const totalAmount = paidTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Group by day for daily sales
    const dailySalesMap = new Map();
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    last7Days.forEach((day) => {
      dailySalesMap.set(day, { date: day, cups: 0, amount: 0 });
    });

    paidTxs.forEach((tx) => {
      const date = new Date(tx.createdAt).toISOString().split("T")[0];
      if (dailySalesMap.has(date)) {
        const dayData = dailySalesMap.get(date);
        dayData.cups += tx.cups;
        dayData.amount += tx.amount;
        dailySalesMap.set(date, dayData);
      }
    });

    // Group by month for monthly sales
    const monthlySalesMap = new Map();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }).reverse();

    last6Months.forEach((month) => {
      monthlySalesMap.set(month, { month, cups: 0, amount: 0 });
    });

    paidTxs.forEach((tx) => {
      const date = new Date(tx.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlySalesMap.has(monthKey)) {
        const monthData = monthlySalesMap.get(monthKey);
        monthData.cups += tx.cups;
        monthData.amount += tx.amount;
        monthlySalesMap.set(monthKey, monthData);
      }
    });

    // Status distribution for pie chart
    const statusDistribution = [
      { name: "Paid", value: paidTxs.length },
      { name: "Active", value: activeTxs.length },
      { name: "Canceled", value: canceledTxs.length },
    ];

    return {
      totalCups,
      totalAmount,
      paidTransactions: paidTxs.length,
      activeTransactions: activeTxs.length,
      canceledTransactions: canceledTxs.length,
      paidAmount: totalAmount,
      dailySales: Array.from(dailySalesMap.values()),
      monthlySales: Array.from(monthlySalesMap.values()),
      statusDistribution,
    };
  }, [transactions]);

  // Update the lastRefillTime useMemo to handle the date format correctly
  const lastRefillTime = useMemo(() => {
    if (!machine || !machine.lastFulfilled) return null;

    // Parse the date using our custom parser
    const lastRefillDate = parseCustomDateFormat(machine.lastFulfilled);
    if (!lastRefillDate || isNaN(lastRefillDate.getTime())) {
      console.error("Invalid date:", machine.lastFulfilled);
      return null;
    }

    // Format the date for display (DD/MM/YYYY)
    const formattedDate = `${lastRefillDate.getDate().toString().padStart(2, "0")}/${(lastRefillDate.getMonth() + 1).toString().padStart(2, "0")}/${lastRefillDate.getFullYear()}`;

    // Format the time (HH:MM:SS)
    const formattedTime = lastRefillDate.toLocaleTimeString();

    // Get relative time (e.g., "20 minutes ago")
    const timeAgo = formatRelativeTime(lastRefillDate);

    return {
      date: lastRefillDate,
      formattedDate,
      formattedTime,
      timeAgo,
      // refiller: machine.lastRefillerName || "Unknown",
    };
  }, [machine]);

  const COLORS = ["#4ade80", "#60a5fa", "#f87171"];

  if (!machine) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Machine Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The machine with ID {machineId} could not be found.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{machine.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                variant={machine.status === "online" ? "success" : "secondary"}
                className="mr-2"
              >
                {machine.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {machine.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/machines/${machineId}/edit`)}
          >
            Edit Machine
          </Button>
          <Button>Request Refill</Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sales Summary Card */}
            <Card className="border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Sales Summary
                </CardTitle>
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

            {/* Last Refill Card */}
            <Card className="border-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Last Refilled
                </CardTitle>
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
                      <span className="font-medium">
                        {lastRefillTime.timeAgo}
                      </span>
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full mr-2 ${
                      machine.status === "online"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Temperature
                </CardTitle>
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
              <CardDescription>
                Daily cup sales for the past 7 days
              </CardDescription>
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
                      <h3 className="text-lg font-medium mb-2">
                        No Sales Data
                      </h3>
                      <p className="text-muted-foreground">
                        No sales have been recorded for this machine yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Machine Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{machine.description}</p>
            </CardContent>
          </Card>

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
                      {new Date(
                        machine.replenishmentOrder.eta
                      ).toLocaleString()}
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
                          ? new Date(
                              machine.deliveryBoy.eta
                            ).toLocaleTimeString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Track Delivery
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-md shadow-sm">
              <Button
                variant={timeRange === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("week")}
                className="rounded-l-md rounded-r-none"
              >
                Week
              </Button>
              <Button
                variant={timeRange === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("month")}
                className="rounded-none border-l-0 border-r-0"
              >
                Month
              </Button>
              <Button
                variant={timeRange === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("year")}
                className="rounded-r-md rounded-l-none"
              >
                Year
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cups Sold
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CupSoda className="h-6 w-6 mr-2 text-green-500" />
                  <span className="text-3xl font-bold">
                    {transactionMetrics.totalCups}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lifetime cups dispensed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 mr-2 text-green-500" />
                  <span className="text-3xl font-bold">
                    ₹{transactionMetrics.totalAmount.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lifetime revenue generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Price per Cup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-blue-500" />
                  <span className="text-3xl font-bold">
                    ₹
                    {transactionMetrics.totalCups
                      ? (
                          transactionMetrics.totalAmount /
                          transactionMetrics.totalCups
                        ).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average revenue per cup
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
                  <span className="text-3xl font-bold">
                    {transactions.length
                      ? Math.round(
                          (transactionMetrics.paidTransactions /
                            transactions.length) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Successful transaction rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  {timeRange === "week"
                    ? "Daily sales for the past week"
                    : "Monthly sales for the past 6 months"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {(timeRange === "week"
                    ? transactionMetrics.dailySales
                    : transactionMetrics.monthlySales
                  ).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          timeRange === "week"
                            ? transactionMetrics.dailySales
                            : transactionMetrics.monthlySales
                        }
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey={timeRange === "week" ? "date" : "month"}
                          tickFormatter={(value) => {
                            if (timeRange === "week") {
                              const d = new Date(value);
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            } else {
                              return value.split("-")[1];
                            }
                          }}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cups"
                          name="Cups Sold"
                          stroke="#4ade80"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="amount"
                          name="Revenue (₹)"
                          stroke="#60a5fa"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Sales Data
                        </h3>
                        <p className="text-muted-foreground">
                          No sales have been recorded for this machine yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Status</CardTitle>
                <CardDescription>
                  Distribution of transaction statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {transactions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={transactionMetrics.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {transactionMetrics.statusDistribution.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Transaction Data
                        </h3>
                        <p className="text-muted-foreground">
                          No transactions have been recorded for this machine
                          yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Recent transactions for this machine
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Transaction ID</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Cups</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .slice(0, 10)
                        .map((tx) => (
                          <tr key={tx.transactionId} className="border-b">
                            <td className="py-3 px-4">{tx.transactionId}</td>
                            <td className="py-3 px-4">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">{tx.cups}</td>
                            <td className="py-3 px-4">
                              ₹{tx.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  tx.status === "paid"
                                    ? "success"
                                    : tx.status === "active"
                                      ? "outline"
                                      : "destructive"
                                }
                              >
                                {tx.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Transaction History
                  </h3>
                  <p className="text-muted-foreground">
                    No transactions have been recorded for this machine yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Machine Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Machine ID
                    </h3>
                    <p className="text-lg">{machine.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Model
                    </h3>
                    <p className="text-lg">{machine.model}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Installation Date
                    </h3>
                    <p className="text-lg">
                      {machine.installedDate
                        ? new Date(machine.installedDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Price per Cup
                    </h3>
                    <p className="text-lg">{machine.price || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      ML to Dispense
                    </h3>
                    <p className="text-lg">{machine.mlToDispense || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Flush Time
                    </h3>
                    <p className="text-lg">
                      {machine.flushTimeMinutes
                        ? `${machine.flushTimeMinutes} minutes`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Technical Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Operating Hours</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.startTime || "00:00"} -{" "}
                        {machine.endTime || "24:00"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Droplet className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dispense Amount</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.mlToDispense || 0} ml
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Address
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="font-medium">{machine.address.building}</p>
                    <p>Floor: {machine.address.floor}</p>
                    <p>{machine.address.area}</p>
                    <p>
                      {machine.address.district}, {machine.address.state}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    GPS Coordinates
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-500" />
                    <div>
                      <p>Latitude: {machine.gisLatitude}</p>
                      <p>Longitude: {machine.gisLongitude}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Map
                </h3>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Map view would be displayed here
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Machine Data History</CardTitle>
              <CardDescription>
                Recent readings from the machine
              </CardDescription>
            </CardHeader>
            <CardContent>
              {machineData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Timestamp</th>
                        <th className="text-left py-3 px-4">Temperature</th>
                        <th className="text-left py-3 px-4">Canister Level</th>
                        <th className="text-left py-3 px-4">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineData.map((data, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">
                            {new Date(data.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {data.temperature !== undefined
                              ? `${data.temperature}°C`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {data.canisterLevel !== undefined
                              ? `${data.canisterLevel}%`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {data.rating !== undefined
                              ? `${data.rating}/5`
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No History Available
                  </h3>
                  <p className="text-muted-foreground">
                    No data has been recorded for this machine yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replenishment History</CardTitle>
              <CardDescription>Past replenishment requests</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Request ID</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Delivery Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.requestId} className="border-b">
                          <td className="py-3 px-4">{request.requestId}</td>
                          <td className="py-3 px-4">
                            {new Date(
                              request.requestDateTime
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                request.requestStatus === "completed"
                                  ? "success"
                                  : request.requestStatus === "pending"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {request.requestStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {request.assignRefillerName || "Not assigned"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Replenishment History
                  </h3>
                  <p className="text-muted-foreground">
                    No replenishment requests have been made for this machine.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
              <CardDescription>
                Upcoming and past maintenance activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No Maintenance Records
                </h3>
                <p className="text-muted-foreground">
                  No maintenance records are available for this machine.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Schedule Maintenance</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Machine performance and SLO data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {machine.slo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Uptime</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.uptime}%
                      </span>
                    </div>
                    <Progress value={machine.slo.uptime} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Response Time</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.responseTime}ms
                      </span>
                    </div>
                    <Progress
                      value={100 - machine.slo.responseTime / 10}
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Availability Target</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.availabilityTarget}%
                      </span>
                    </div>
                    <Progress
                      value={machine.slo.availabilityTarget}
                      className="h-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Performance Data
                  </h3>
                  <p className="text-muted-foreground">
                    Performance metrics are not available for this machine.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
