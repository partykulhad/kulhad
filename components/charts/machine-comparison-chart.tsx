"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, subMonths } from "date-fns";
import { BarChart3Icon, CalendarIcon, CoffeeIcon, IndianRupeeIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { DateRange } from "react-day-picker";

interface Machine {
  id: string;
  name: string;
}

interface MachineComparisonChartProps {
  machines: Machine[];
}

export function MachineComparisonChart({ machines }: MachineComparisonChartProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  const transactions = useQuery(api.transactions.list) || [];

  // 2-month calendar on desktop (easier to pick a wide range); a 2-month-wide
  // popup would overflow a phone screen, so it drops to 1 month below 768px.
  const [calendarMonths, setCalendarMonths] = useState(1);
  useEffect(() => {
    const updateMonths = () => setCalendarMonths(window.innerWidth >= 768 ? 2 : 1);
    updateMonths();
    window.addEventListener("resize", updateMonths);
    return () => window.removeEventListener("resize", updateMonths);
  }, []);

  const chartData = useMemo(() => {
    return machines.map((machine) => {
      const machineTxs = transactions.filter((t) => {
        if (t.machineId !== machine.id || t.status !== "paid") return false;
        if (dateRange?.from && t.createdAt < dateRange.from.getTime()) return false;
        if (dateRange?.to && t.createdAt > dateRange.to.getTime() + 24 * 60 * 60 * 1000 - 1) return false;
        return true;
      });

      return {
        name: machine.name,
        cups: machineTxs.reduce((sum, t) => sum + t.cups, 0),
        revenue: Number.parseFloat(
          machineTxs.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
        ),
      };
    });
  }, [machines, transactions, dateRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 shadow-2xl">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <CoffeeIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-gray-600 dark:text-gray-400">Cups Dispensed:</span>
              <span className="font-bold text-emerald-600">{payload[0]?.value}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupeeIcon className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
              <span className="font-bold text-blue-600">
                ₹{payload[1]?.value?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-purple-50/10 to-pink-50/20 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10" />

        <CardHeader className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
                <BarChart3Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                  Business Unit Performance Comparison
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                  Cross-unit revenue and consumption analysis
                </p>
              </div>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200/60 dark:border-gray-600/60 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-300 rounded-2xl font-semibold"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd")} -{" "}
                        {format(dateRange.to, "MMM dd")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={calendarMonths}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200/30 dark:stroke-gray-700/30"
                />
                <XAxis
                  dataKey="name"
                  className="text-xs text-gray-500 dark:text-gray-400"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
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
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="cups"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/30">
              <div className="w-6 h-6 rounded-2xl bg-emerald-500 shadow-lg" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Cups Dispensed
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/30">
              <div className="w-6 h-6 rounded-2xl bg-blue-500 shadow-lg" />
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                Revenue (₹)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
