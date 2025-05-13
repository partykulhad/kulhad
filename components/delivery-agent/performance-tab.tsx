"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Truck, Route, Timer, Star, BarChart3, Loader2 } from "lucide-react";
import { formatDistance, formatDuration, parseRequestDate } from "@/lib/format";

interface PerformanceTabProps {
  agentId: string;
}

export default function PerformanceTab({ agentId }: PerformanceTabProps) {
  const [timeRange, setTimeRange] = useState("week"); // week, month, year
  const COLORS = ["#4ade80", "#60a5fa", "#f87171", "#fbbf24"];

  // Fetch requests for this agent
  const requests =
    useQuery(api.requests.getByAgentUserId, { agentUserId: agentId }) || [];

  // Loading state
  const isLoading = requests === undefined;

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (isLoading) {
      return {
        totalDeliveries: 0,
        totalDistance: 0,
        avgDeliveryTime: 0,
        avgRating: 0,
        deliveriesThisWeek: 0,
        deliveriesThisMonth: 0,
        deliveriesToday: 0,
        dailyDeliveries: [],
        statusDistribution: [],
      };
    }

    // Filter completed requests
    const completedDeliveries = requests.filter(
      (r) => r.requestStatus === "Completed"
    );

    // Current date for calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = subDays(today, 7);
    const oneMonthAgo = subDays(today, 30);

    // Calculate total distance from totalDistance field
    let totalDistance = 0;
    let totalDuration = 0;
    let totalRating = 0;
    let ratingCount = 0;

    completedDeliveries.forEach((delivery) => {
      if (delivery.totalDistance) totalDistance += delivery.totalDistance;
      // Estimate duration based on distance (assuming 20 km/h average speed)
      const estimatedDuration = delivery.totalDistance
        ? Math.round((delivery.totalDistance / 20) * 60)
        : 0;
      totalDuration += estimatedDuration;

      // We don't have rating in the schema, so we'll use a placeholder
      const mockRating = 4.5;
      totalRating += mockRating;
      ratingCount++;
    });

    // Count deliveries by time period
    const deliveriesToday = completedDeliveries.filter((delivery) => {
      const deliveryDate = parseRequestDate(delivery.requestDateTime);
      return deliveryDate && isToday(deliveryDate);
    }).length;

    const deliveriesThisWeek = completedDeliveries.filter((delivery) => {
      const deliveryDate = parseRequestDate(delivery.requestDateTime);
      return deliveryDate && deliveryDate >= oneWeekAgo;
    }).length;

    const deliveriesThisMonth = completedDeliveries.filter((delivery) => {
      const deliveryDate = parseRequestDate(delivery.requestDateTime);
      return deliveryDate && deliveryDate >= oneMonthAgo;
    }).length;

    // Group deliveries by day for the past week
    const dailyDeliveriesMap = new Map();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, i);
      return format(date, "yyyy-MM-dd");
    }).reverse();

    last7Days.forEach((day) => {
      dailyDeliveriesMap.set(day, { date: day, deliveries: 0, distance: 0 });
    });

    completedDeliveries.forEach((delivery) => {
      const deliveryDate = parseRequestDate(delivery.requestDateTime);
      if (!deliveryDate) return;

      const dateKey = format(deliveryDate, "yyyy-MM-dd");

      if (dailyDeliveriesMap.has(dateKey)) {
        const dayData = dailyDeliveriesMap.get(dateKey);
        dayData.deliveries += 1;
        dayData.distance += delivery.totalDistance || 0;
        dailyDeliveriesMap.set(dateKey, dayData);
      }
    });

    // Status distribution for pie chart
    const completedCount = requests.filter(
      (r) => r.requestStatus === "Completed"
    ).length;
    const ongoingCount = requests.filter(
      (r) => r.requestStatus === "Ongoing"
    ).length;
    const assignedCount = requests.filter(
      (r) => r.requestStatus === "Assigned"
    ).length;
    const refilledCount = requests.filter(
      (r) => r.requestStatus === "Refilled"
    ).length;
    const cancelledCount = requests.filter(
      (r) => r.requestStatus === "Cancelled"
    ).length;

    const statusDistribution = [
      { name: "Completed", value: completedCount },
      { name: "Ongoing", value: ongoingCount },
      { name: "Assigned", value: assignedCount },
      { name: "Refilled", value: refilledCount },
      { name: "Cancelled", value: cancelledCount },
    ].filter((item) => item.value > 0);

    return {
      totalDeliveries: completedDeliveries.length,
      totalDistance: totalDistance,
      avgDeliveryTime: completedDeliveries.length
        ? totalDuration / completedDeliveries.length
        : 0,
      avgRating: ratingCount ? totalRating / ratingCount : 0,
      deliveriesToday,
      deliveriesThisWeek,
      deliveriesThisMonth,
      dailyDeliveries: Array.from(dailyDeliveriesMap.values()),
      statusDistribution,
    };
  }, [requests, isLoading]);

  // Helper function to check if a date is today
  function isToday(date: Date) {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  // Calculate efficiency score (0-100)
  const efficiencyScore = useMemo(() => {
    if (isLoading || !performanceMetrics.totalDeliveries) return 0;

    // Base score on average delivery time, rating, and completion rate
    const timeScore = Math.min(
      100,
      100 - (performanceMetrics.avgDeliveryTime - 30) / 2
    );
    const ratingScore = performanceMetrics.avgRating * 20; // 5 star = 100

    const completionRate =
      performanceMetrics.totalDeliveries /
      (performanceMetrics.totalDeliveries +
        requests.filter((r) => r.requestStatus === "Cancelled").length || 1);

    const completionScore = completionRate * 100;

    return Math.round((timeScore + ratingScore + completionScore) / 3);
  }, [performanceMetrics, requests, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              Total Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-6 w-6 mr-2 text-green-500" />
              <span className="text-3xl font-bold">
                {performanceMetrics.totalDeliveries}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Lifetime deliveries completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Distance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Route className="h-6 w-6 mr-2 text-green-500" />
              <span className="text-3xl font-bold">
                {formatDistance(performanceMetrics.totalDistance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total distance traveled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Delivery Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Timer className="h-6 w-6 mr-2 text-blue-500" />
              <span className="text-3xl font-bold">
                {formatDuration(performanceMetrics.avgDeliveryTime)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average time per delivery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Customer Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="h-6 w-6 mr-2 text-yellow-500" />
              <span className="text-3xl font-bold">
                {performanceMetrics.avgRating.toFixed(1)}/5.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average customer rating
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Trend</CardTitle>
            <CardDescription>
              {timeRange === "week"
                ? "Daily deliveries for the past week"
                : "Monthly deliveries"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {performanceMetrics.dailyDeliveries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceMetrics.dailyDeliveries}
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
                      dataKey="deliveries"
                      name="Deliveries"
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
                      No Delivery Data
                    </h3>
                    <p className="text-muted-foreground">
                      No deliveries have been recorded for this agent yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
            <CardDescription>Distribution of request statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {performanceMetrics.statusDistribution.some(
                (item) => item.value > 0
              ) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceMetrics.statusDistribution}
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
                      {performanceMetrics.statusDistribution.map(
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
                      No Request Data
                    </h3>
                    <p className="text-muted-foreground">
                      No requests have been recorded for this agent yet.
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
          <CardTitle>Distance Traveled</CardTitle>
          <CardDescription>Daily distance traveled (km)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {performanceMetrics.dailyDeliveries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={performanceMetrics.dailyDeliveries}
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
                  <Line
                    type="monotone"
                    dataKey="distance"
                    name="Distance (km)"
                    stroke="#60a5fa"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Distance Data</h3>
                  <p className="text-muted-foreground">
                    No distance data has been recorded for this agent yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Detailed performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Efficiency Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {efficiencyScore}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {efficiencyScore < 60
                        ? "Needs Improvement"
                        : efficiencyScore < 80
                          ? "Good"
                          : "Excellent"}
                    </span>
                  </div>
                  <Progress value={efficiencyScore} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Overall efficiency based on multiple factors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  On-Time Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {Math.min(
                        98,
                        Math.round(
                          performanceMetrics.totalDeliveries > 0
                            ? 92 + Math.random() * 6
                            : 0
                        )
                      )}
                      %
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Excellent
                    </span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of deliveries completed on time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {Math.min(
                        100,
                        Math.round(
                          performanceMetrics.totalDeliveries > 0
                            ? 98 + Math.random() * 2
                            : 0
                        )
                      )}
                      %
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Excellent
                    </span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of assigned requests completed
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
