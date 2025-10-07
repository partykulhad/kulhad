"use client";

import { useState, useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, subDays, startOfDay, endOfDay, isToday } from "date-fns";
import {
  TrendingUpIcon,
  IndianRupeeIcon,
  CoffeeIcon,
  CalendarIcon,
  BarChart3Icon,
  LineChartIcon,
  AreaChartIcon,
  SparklesIcon,
  ClockIcon,
  SunIcon,
  FilterIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ActivityIcon,
  ZapIcon,
  CrownIcon,
} from "lucide-react";
import { motion } from "framer-motion";

interface SalesData {
  date: string;
  sales: number;
  cups: number;
}

export function SalesChart() {
  const [timeRange, setTimeRange] = useState("7days");
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("area");

  // Fetch transactions from Convex
  const transactions = useQuery(api.transactions.list) || [];

  const timeRangeOptions = [
    {
      value: "today",
      label: "Today",
      icon: SunIcon,
      color: "from-yellow-500 to-orange-500",
      days: 1,
    },
    {
      value: "7days",
      label: "Last 7 Days",
      icon: CalendarIcon,
      color: "from-blue-500 to-cyan-500",
      days: 7,
    },
    {
      value: "1month",
      label: "Last Month",
      icon: ClockIcon,
      color: "from-purple-500 to-pink-500",
      days: 30,
    },
    {
      value: "all",
      label: "All Time",
      icon: TrendingUpIcon,
      color: "from-emerald-500 to-teal-500",
      days: 365,
    },
  ];

  const chartTypeOptions = [
    {
      value: "line",
      label: "Line",
      icon: LineChartIcon,
      color: "from-blue-500 to-indigo-500",
    },
    {
      value: "area",
      label: "Area",
      icon: AreaChartIcon,
      color: "from-purple-500 to-pink-500",
    },
    {
      value: "bar",
      label: "Bar",
      icon: BarChart3Icon,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  // Process transactions based on selected time range
  const chartData = useMemo(() => {
    const paidTransactions = transactions.filter(
      (transaction) => transaction.status === "paid"
    );

    const selectedRange = timeRangeOptions.find((r) => r.value === timeRange);
    let days = selectedRange?.days || 7;

    // Special handling for "today"
    if (timeRange === "today") {
      const today = new Date();
      const todayTransactions = paidTransactions.filter((transaction) =>
        isToday(new Date(transaction.createdAt))
      );

      // Create hourly data for today
      const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const hourTransactions = todayTransactions.filter((t) => {
          const transactionHour = new Date(t.createdAt).getHours();
          return transactionHour === hour;
        });

        const sales = hourTransactions.reduce((sum, t) => sum + t.amount, 0);
        const cups = hourTransactions.reduce((sum, t) => sum + t.cups, 0);

        return {
          date: `${hour.toString().padStart(2, "0")}:00`,
          sales: Number.parseFloat(sales.toFixed(2)),
          cups,
        };
      });

      return hours;
    }

    // For "all time", calculate actual range from data
    if (timeRange === "all" && paidTransactions.length > 0) {
      const oldestTransaction = Math.min(
        ...paidTransactions.map((t) => new Date(t.createdAt).getTime())
      );
      const daysDiff = Math.ceil(
        (Date.now() - oldestTransaction) / (1000 * 60 * 60 * 24)
      );
      days = Math.min(daysDiff, 365);
    }

    const today = new Date();

    // Create an array of the last N days
    const daysArray = Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - i - 1);
      return {
        date: format(date, "MMM dd"),
        timestamp: startOfDay(date).getTime(),
        endTimestamp: endOfDay(date).getTime(),
        sales: 0,
        cups: 0,
      };
    });

    // Aggregate transactions by day
    paidTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);

      const dayIndex = daysArray.findIndex(
        (day) =>
          transactionDate >= new Date(day.timestamp) &&
          transactionDate <= new Date(day.endTimestamp)
      );

      if (dayIndex !== -1) {
        daysArray[dayIndex].sales += transaction.amount;
        daysArray[dayIndex].cups += transaction.cups;
      }
    });

    // Format data for the chart
    return daysArray.map((day) => ({
      date: day.date,
      sales: Number.parseFloat(day.sales.toFixed(2)),
      cups: day.cups,
    }));
  }, [timeRange, transactions]);

  // Calculate summary statistics with previous period comparison
  const stats = useMemo(() => {
    const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
    const totalCups = chartData.reduce((sum, day) => sum + day.cups, 0);
    const avgDaily = chartData.length > 0 ? totalSales / chartData.length : 0;
    const maxDay = chartData.reduce(
      (max, day) => (day.sales > max.sales ? day : max),
      chartData[0] || { sales: 0, date: "", cups: 0 }
    );

    // Calculate growth (simplified - in real app, compare with previous period)
    const salesGrowth = totalSales > 0 ? 12.5 : 0; // Mock growth percentage
    const cupsGrowth = totalCups > 0 ? 8.3 : 0; // Mock growth percentage

    return {
      totalSales,
      totalCups,
      avgDaily,
      maxDay,
      salesGrowth,
      cupsGrowth,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-3xl p-6 shadow-2xl shadow-black/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl" />
          <div className="relative space-y-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {timeRange === "today" ? "Hour" : "Date"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 mb-3 inline-block">
                  <IndianRupeeIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Revenue
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ₹{payload[0]?.value?.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-center">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 mb-3 inline-block">
                  <CoffeeIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Cups Sold
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {payload[1]?.value?.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="cupsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200/30 dark:stroke-gray-700/30"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#salesGradient)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="cups"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#cupsGradient)"
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200/30 dark:stroke-gray-700/30"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="sales"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="cups"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200/30 dark:stroke-gray-700/30"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-xs text-gray-500 dark:text-gray-400"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#3b82f6"
              strokeWidth={4}
              activeDot={{
                r: 8,
                fill: "#3b82f6",
                strokeWidth: 3,
                stroke: "#ffffff",
              }}
              dot={{ r: 0 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cups"
              stroke="#10b981"
              strokeWidth={4}
              activeDot={{
                r: 8,
                fill: "#10b981",
                strokeWidth: 3,
                stroke: "#ffffff",
              }}
              dot={{ r: 0 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Control Section */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-purple-50/10 to-pink-50/20 dark:from-blue-900/5 dark:via-purple-900/3 dark:to-pink-900/5" />
        <CardContent className="relative p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                  <ActivityIcon className="h-3 w-3 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                    Sales Analytics
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    Real-time revenue insights and performance tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Time Range Filter */}
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-gray-500" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px] h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200/60 dark:border-gray-600/60 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-300 rounded-2xl font-semibold">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-2xl p-2">
                    {timeRangeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="rounded-2xl mx-1 my-1 p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl bg-gradient-to-r ${option.color} shadow-md`}
                          >
                            <option.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-semibold">{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chart Type Selector */}
              <div className="flex gap-2">
                {chartTypeOptions.map((option) => (
                  <TooltipProvider key={option.value}>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={
                            chartType === option.value ? "default" : "ghost"
                          }
                          size="lg"
                          onClick={() =>
                            setChartType(
                              option.value as "line" | "area" | "bar"
                            )
                          }
                          className={`h-12 px-4 transition-all duration-300 rounded-2xl font-semibold ${
                            chartType === option.value
                              ? `bg-gradient-to-r ${option.color} text-white shadow-xl hover:shadow-2xl transform hover:scale-105`
                              : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200/60 dark:border-gray-600/60 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-xl"
                          }`}
                        >
                          <option.icon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl"
                      >
                        <p className="font-semibold">{option.label} Chart</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards with Better Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/90 dark:from-blue-900/30 dark:via-gray-900 dark:to-cyan-900/30 border-2 border-blue-200/50 dark:border-blue-700/50 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-200/40 dark:hover:shadow-blue-800/40 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-2xl" />

            <CardContent className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <IndianRupeeIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Total Revenue
                      </p>
                      <div className="flex items-center gap-2">
                        <ArrowUpIcon className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-semibold text-green-600">
                          +{stats.salesGrowth}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-blue-900 dark:text-blue-100 group-hover:scale-105 transition-transform duration-300">
                        ₹
                        {stats.totalSales.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000 group-hover:shadow-lg group-hover:shadow-blue-300/50"
                        style={{ width: "75%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cups Sold Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/90 dark:from-emerald-900/30 dark:via-gray-900 dark:to-teal-900/30 border-2 border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-emerald-800/40 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl" />

            <CardContent className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <CoffeeIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Cups Served
                      </p>
                      <div className="flex items-center gap-2">
                        <ArrowUpIcon className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-semibold text-green-600">
                          +{stats.cupsGrowth}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 group-hover:scale-105 transition-transform duration-300">
                      {stats.totalCups.toLocaleString("en-IN")}
                    </div>
                    <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-1000 group-hover:shadow-lg group-hover:shadow-emerald-300/50"
                        style={{ width: "60%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Average Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50/90 via-white to-pink-50/90 dark:from-purple-900/30 dark:via-gray-900 dark:to-pink-900/30 border-2 border-purple-200/50 dark:border-purple-700/50 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-200/40 dark:hover:shadow-purple-800/40 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-2xl" />

            <CardContent className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <TrendingUpIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Daily Average
                      </p>
                      <div className="flex items-center gap-2">
                        <ZapIcon className="h-3 w-3 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-600">
                          Trending
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-purple-900 dark:text-purple-100 group-hover:scale-105 transition-transform duration-300">
                        ₹
                        {stats.avgDaily.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="w-full bg-purple-100 dark:bg-purple-900/30 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000 group-hover:shadow-lg group-hover:shadow-purple-300/50"
                        style={{ width: "45%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Best Day Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50/90 via-white to-red-50/90 dark:from-orange-900/30 dark:via-gray-900 dark:to-red-900/30 border-2 border-orange-200/50 dark:border-orange-700/50 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-200/40 dark:hover:shadow-orange-800/40 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-2xl" />

            <CardContent className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 shadow-xl group-hover:scale-110 transition-transform duration-300">
                      <CrownIcon className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        Best Day
                      </p>
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-3 w-3 text-yellow-500 animate-pulse" />
                        <span className="text-xs font-semibold text-orange-600">
                          Record
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-orange-900 dark:text-orange-100 group-hover:scale-105 transition-transform duration-300">
                      {stats.maxDay?.date || "N/A"}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-orange-700 dark:text-orange-200">
                        ₹
                        {stats.maxDay?.sales?.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        }) || "0"}
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      {stats.maxDay?.cups || 0} cups sold
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Chart */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-purple-50/10 to-pink-50/20 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10" />

        <CardContent className="relative p-8">
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>

          {/* Enhanced Legend */}
          <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/30">
              <div className="w-6 h-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg" />
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                Revenue (₹)
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/30">
              <div className="w-6 h-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Cups Sold
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
