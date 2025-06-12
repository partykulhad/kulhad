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
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SalesData {
  date: string;
  sales: number;
  cups: number;
}

export function SalesChart() {
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch transactions from Convex
  const transactions = useQuery(api.transactions.list) || [];

  // Process transactions based on selected time range - using useMemo to avoid unnecessary recalculations
  const chartData = useMemo(() => {
    // Filter paid transactions
    const paidTransactions = transactions.filter(
      (transaction) => transaction.status === "paid"
    );

    const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Daily sales and cups served</CardDescription>
        </div>
        <Select defaultValue={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="14d">Last 14 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-sm" />
              <YAxis yAxisId="left" className="text-sm" />
              <YAxis yAxisId="right" orientation="right" className="text-sm" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Sales
                            </span>
                            <span className="font-bold text-muted-foreground">
                              ${payload[0].value}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Cups
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[1].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="#2563eb"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cups"
                stroke="#16a34a"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
