"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoffeeIcon, ThermometerIcon, DropletIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface OverviewCardsProps {
  machines: any[];
}

export function OverviewCards({ machines }: OverviewCardsProps) {
  const [timeRange, setTimeRange] = useState("today");

  // Fetch transactions from Convex
  const transactions = useQuery(api.transactions.list) || [];

  // Filter paid transactions based on selected time range
  const paidTransactions = transactions.filter(
    (transaction) => transaction.status === "paid"
  );

  // Calculate total sales and cups based on time range
  const calculateTotals = () => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const filteredTransactions = paidTransactions.filter((transaction) => {
      if (timeRange === "today") {
        return transaction.createdAt >= today;
      } else if (timeRange === "month") {
        return transaction.createdAt >= thisMonth;
      } else {
        return true; // all time
      }
    });

    const totalAmount = filteredTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    );
    const totalCups = filteredTransactions.reduce(
      (sum, transaction) => sum + transaction.cups,
      0
    );

    return { totalAmount, totalCups };
  };

  const { totalAmount, totalCups } = calculateTotals();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex justify-end">
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Total Machines
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CoffeeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {machines.length}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0"
                >
                  {machines.filter((m) => m.status === "online").length} Online
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0"
                >
                  {machines.filter((m) => m.status === "offline").length}{" "}
                  Offline
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {timeRange === "today"
                  ? "Sales Today"
                  : timeRange === "month"
                    ? "Sales This Month"
                    : "Total Sales"}
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DropletIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                ₹{totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{totalCups}</span> cups served{" "}
                {timeRange === "today"
                  ? "today"
                  : timeRange === "month"
                    ? "this month"
                    : "all time"}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Average Temperature
              </CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <ThermometerIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {Math.round(
                  machines.reduce((acc, m) => acc + m.temperature, 0) /
                    (machines.length || 1)
                )}
                °C
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  Optimal: 80°C - 82°C
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
