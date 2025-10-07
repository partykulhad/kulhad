"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CoffeeIcon,
  ThermometerIcon,
  DropletIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  ActivityIcon,
  IndianRupeeIcon,
  WifiIcon,
  WifiOffIcon,
  SparklesIcon,
  FilterIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { subDays, startOfDay, endOfDay } from "date-fns";

interface OverviewCardsProps {
  machines: any[];
}

export function OverviewCards({ machines }: OverviewCardsProps) {
  const [timeRange, setTimeRange] = useState("7days");

  // Fetch transactions from Convex
  const transactions = useQuery(api.transactions.list) || [];

  const timeRangeOptions = [
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
      days: null, // All time
    },
  ];

  // Filter paid transactions based on selected time range
  const paidTransactions = useMemo(() => {
    const allPaidTransactions = transactions.filter(
      (transaction) => transaction.status === "paid"
    );

    if (timeRange === "all") {
      return allPaidTransactions;
    }

    const selectedRange = timeRangeOptions.find((r) => r.value === timeRange);
    const days = selectedRange?.days || 7;
    const cutoffDate = startOfDay(subDays(new Date(), days));

    return allPaidTransactions.filter((transaction) => {
      return new Date(transaction.createdAt) >= cutoffDate;
    });
  }, [transactions, timeRange]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = paidTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    );
    const totalCups = paidTransactions.reduce(
      (sum, transaction) => sum + transaction.cups,
      0
    );

    return { totalAmount, totalCups };
  }, [paidTransactions]);

  // Calculate machine statistics
  const machineStats = useMemo(() => {
    const onlineMachines = machines.filter((m) => m.status === "online").length;
    const offlineMachines = machines.filter(
      (m) => m.status === "offline"
    ).length;
    const avgTemperature =
      machines.length > 0
        ? machines.reduce((acc, m) => acc + (m.temperature || 0), 0) /
          machines.length
        : 0;
    const lowInventoryCount = machines.filter(
      (m) => (m.canisterLevel || 0) < 20
    ).length;

    return {
      onlineMachines,
      offlineMachines,
      avgTemperature: Math.round(avgTemperature),
      lowInventoryCount,
      totalMachines: machines.length,
    };
  }, [machines]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const item = {
    hidden: { y: 30, opacity: 0, scale: 0.9 },
    show: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "7days":
        return "Last 7 Days";
      case "1month":
        return "Last Month";
      default:
        return "All Time";
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Dashboard Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time insights and performance metrics
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px] h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-600/60 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <SelectValue placeholder="Time Range" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-2xl">
                  {timeRangeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-xl mx-1 my-1 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg bg-gradient-to-r ${option.color}`}
                        >
                          <option.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter data by time range</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Machines Card */}
        <motion.div variants={item}>
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-blue-50/95 dark:from-gray-900/95 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-2xl hover:shadow-blue-200/30 dark:hover:shadow-blue-700/20 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl" />

            <CardHeader className="relative flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Total Machines
              </CardTitle>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CoffeeIcon className="h-3 w-3 text-white" />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="text-4xl font-black text-blue-900 dark:text-blue-100 mb-4 group-hover:scale-105 transition-transform duration-300">
                {machineStats.totalMachines}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 font-semibold px-3 py-1 rounded-xl">
                  <WifiIcon className="h-3 w-3 mr-1" />
                  {machineStats.onlineMachines} Online
                </Badge>
                <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 font-semibold px-3 py-1 rounded-xl">
                  <WifiOffIcon className="h-3 w-3 mr-1" />
                  {machineStats.offlineMachines} Offline
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sales Card */}
        <motion.div variants={item}>
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-emerald-50/95 dark:from-gray-900/95 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-2xl hover:shadow-emerald-200/30 dark:hover:shadow-emerald-700/20 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl" />

            <CardHeader className="relative flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Sales - {getTimeRangeLabel()}
              </CardTitle>
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <IndianRupeeIcon className="h-3 w-3 text-white" />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  ₹
                </span>
                <span className="text-4xl font-black text-emerald-900 dark:text-emerald-100 group-hover:scale-105 transition-transform duration-300">
                  {totals.totalAmount.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CoffeeIcon className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {totals.totalCups.toLocaleString("en-IN")} cups served
                </span>
                <SparklesIcon className="h-3 w-3 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Average Temperature Card */}
        <motion.div variants={item}>
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-amber-50/95 dark:from-gray-900/95 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-700/50 hover:shadow-2xl hover:shadow-amber-200/30 dark:hover:shadow-amber-700/20 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl" />

            <CardHeader className="relative flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Average Temperature
              </CardTitle>
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ThermometerIcon className="h-3 w-3 text-white" />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black text-amber-900 dark:text-amber-100 group-hover:scale-105 transition-transform duration-300">
                  {machineStats.avgTemperature}
                </span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  °C
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${machineStats.avgTemperature >= 80 && machineStats.avgTemperature <= 82 ? "bg-green-500" : "bg-amber-500"}`}
                  />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Optimal: 80°C - 82°C
                  </span>
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-900/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((machineStats.avgTemperature / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Inventory Status Card */}
        <motion.div variants={item}>
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-purple-50/95 dark:from-gray-900/95 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-2xl hover:shadow-purple-200/30 dark:hover:shadow-purple-700/20 transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl" />

            <CardHeader className="relative flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                Inventory Status
              </CardTitle>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DropletIcon className="h-3 w-3 text-white" />
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="text-4xl font-black text-purple-900 dark:text-purple-100 mb-4 group-hover:scale-105 transition-transform duration-300">
                {machineStats.totalMachines - machineStats.lowInventoryCount}
                <span className="text-lg text-purple-600 dark:text-purple-400">
                  /{machineStats.totalMachines}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Stocked Well
                  </span>
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700 px-2 py-1 rounded-lg text-xs">
                    {machineStats.totalMachines -
                      machineStats.lowInventoryCount}
                  </Badge>
                </div>
                {machineStats.lowInventoryCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Low Stock
                    </span>
                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700 px-2 py-1 rounded-lg text-xs animate-pulse">
                      {machineStats.lowInventoryCount}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
