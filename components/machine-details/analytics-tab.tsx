"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  CupSoda,
  DollarSign,
  TrendingUp,
  CheckCircle,
  BarChart3,
  History,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Transaction {
  _id: string;
  transactionId: string;
  status: string;
  cups: number;
  amount: number;
  createdAt: number;
  [key: string]: any;
}

interface TransactionMetrics {
  totalCups: number;
  totalAmount: number;
  paidTransactions: number;
  activeTransactions: number;
  canceledTransactions: number;
  paidAmount: number;
  dailySales: Array<{
    date: string;
    cups: number;
    amount: number;
  }>;
  monthlySales: Array<{
    month: string;
    cups: number;
    amount: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
  }>;
}

interface AnalyticsTabProps {
  transactionMetrics: TransactionMetrics;
  transactions: Transaction[];
}

export function AnalyticsTab({
  transactionMetrics,
  transactions,
}: AnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date(),
  });

  const COLORS = ["#4ade80", "#60a5fa", "#f87171"];

  // Filter transactions based on date range
  const filteredTransactions = transactions.filter((tx) => {
    if (!dateRange?.from || !dateRange?.to) return true;
    const txDate = new Date(tx.createdAt);
    return txDate >= dateRange.from && txDate <= dateRange.to;
  });

  // Recalculate metrics for filtered data
  const filteredMetrics = {
    totalCups: filteredTransactions
      .filter((tx) => tx.status === "paid")
      .reduce((sum, tx) => sum + tx.cups, 0),
    totalAmount: filteredTransactions
      .filter((tx) => tx.status === "paid")
      .reduce((sum, tx) => sum + tx.amount, 0),
    paidTransactions: filteredTransactions.filter((tx) => tx.status === "paid")
      .length,
    activeTransactions: filteredTransactions.filter(
      (tx) => tx.status === "active"
    ).length,
    canceledTransactions: filteredTransactions.filter(
      (tx) => tx.status === "canceled"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex justify-end mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Metrics Cards */}
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
                {filteredMetrics.totalCups}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              In selected date range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CreditCard className="h-6 w-6 mr-2 text-green-500" />
              <span className="text-3xl font-bold">
                ₹{filteredMetrics.totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              In selected date range
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
                {filteredMetrics.totalCups
                  ? (
                      filteredMetrics.totalAmount / filteredMetrics.totalCups
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
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
              <span className="text-3xl font-bold">
                {filteredTransactions.length
                  ? Math.round(
                      (filteredMetrics.paidTransactions /
                        filteredTransactions.length) *
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>
              Sales trend for selected date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {filteredTransactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
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
                      tickFormatter={(value) => {
                        const d = new Date(value);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
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
                    <h3 className="text-lg font-medium mb-2">No Sales Data</h3>
                    <p className="text-muted-foreground">
                      No sales in selected date range.
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
              {filteredTransactions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Paid",
                          value: filteredMetrics.paidTransactions,
                        },
                        {
                          name: "Active",
                          value: filteredMetrics.activeTransactions,
                        },
                        {
                          name: "Canceled",
                          value: filteredMetrics.canceledTransactions,
                        },
                      ]}
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
                      {[
                        {
                          name: "Paid",
                          value: filteredMetrics.paidTransactions,
                        },
                        {
                          name: "Active",
                          value: filteredMetrics.activeTransactions,
                        },
                        {
                          name: "Canceled",
                          value: filteredMetrics.canceledTransactions,
                        },
                      ].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
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
                      No transactions in selected date range.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Recent transactions for selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
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
                  {filteredTransactions
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 10)
                    .map((tx) => (
                      <tr key={tx.transactionId} className="border-b">
                        <td className="py-3 px-4">{tx.transactionId}</td>
                        <td className="py-3 px-4">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{tx.cups}</td>
                        <td className="py-3 px-4">₹{tx.amount.toFixed(2)}</td>
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
                No transactions in selected date range.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
