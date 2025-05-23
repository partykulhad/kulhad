"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CoffeeIcon,
  ThermometerIcon,
  DropletIcon,
  AlertCircleIcon,
} from "lucide-react";
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
  alerts: { low: number; maintenance: number };
}

export function OverviewCards({ machines, alerts }: OverviewCardsProps) {
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
      className="space-y-4"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Machines
              </CardTitle>
              <CoffeeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{machines.length}</div>
              <div className="flex items-center mt-1 space-x-2">
                <Badge variant="success" className="h-auto">
                  {machines.filter((m) => m.status === "online").length} Online
                </Badge>
                <Badge variant="secondary" className="h-auto">
                  {machines.filter((m) => m.status === "offline").length}{" "}
                  Offline
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {timeRange === "today"
                  ? "Total Sales Today"
                  : timeRange === "month"
                    ? "Total Sales This Month"
                    : "Total Sales All Time"}
              </CardTitle>
              <DropletIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalAmount.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalCups} cups served{" "}
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
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Average Temperature
              </CardTitle>
              <ThermometerIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  machines.reduce((acc, m) => acc + m.temperature, 0) /
                    (machines.length || 1)
                )}
                °C
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Optimal range: 80°C - 82°C
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Alerts
              </CardTitle>
              <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.low + alerts.maintenance}
              </div>
              <div className="flex items-center mt-1 space-x-2">
                <Badge variant="destructive" className="h-auto">
                  {alerts.low} Low Inventory
                </Badge>
                <Badge variant="warning" className="h-auto">
                  {alerts.maintenance} Maintenance
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
