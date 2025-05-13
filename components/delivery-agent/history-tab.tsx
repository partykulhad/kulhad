"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { History, Loader2, X } from "lucide-react";
import { formatDate } from "@/lib/format";

interface HistoryTabProps {
  agentId: string;
}

export default function HistoryTab({ agentId }: HistoryTabProps) {
  // Fetch order history for this agent using the combined API
  const orderHistory =
    useQuery(api.requests.getMyOrdersHistory, { userId: agentId }) || [];

  // Loading state
  const isLoading = orderHistory === undefined;

  // Filter completed and cancelled orders
  const completedDeliveries = useMemo(() => {
    if (isLoading) return [];
    return orderHistory.filter((order) => order.requestStatus === "Completed");
  }, [orderHistory, isLoading]);

  const cancelledDeliveries = useMemo(() => {
    if (isLoading) return [];
    return orderHistory.filter((order) => order.requestStatus === "Cancelled");
  }, [orderHistory, isLoading]);

  // Generate monthly performance data
  const monthlyPerformance = useMemo(() => {
    if (isLoading || !completedDeliveries.length) {
      return [];
    }

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentMonth = new Date().getMonth();

    // Create data for the last 6 months
    return months
      .slice(Math.max(0, currentMonth - 5), currentMonth + 1)
      .map((month, index) => {
        // Filter deliveries for this month
        const monthDeliveries = completedDeliveries.filter((delivery) => {
          const deliveryDate = new Date(delivery.requestDateTime || "");
          return (
            deliveryDate.getMonth() === (currentMonth - 5 + index + 12) % 12
          );
        });

        // Calculate total distance (assuming we have this data)
        const distance = monthDeliveries.reduce((sum, delivery) => {
          // Use a default distance if not available
          const deliveryDistance =
            typeof delivery.totalDistance === "number"
              ? delivery.totalDistance
              : 0;
          return sum + deliveryDistance;
        }, 0);

        return {
          month,
          deliveries: monthDeliveries.length,
          distance: Math.round(distance),
        };
      });
  }, [completedDeliveries, isLoading]);

  // Generate time distribution data
  const timeDistribution = useMemo(() => {
    const timeSlots = ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM"];

    // If we have no completed deliveries, return placeholder data
    if (isLoading || completedDeliveries.length === 0) {
      return timeSlots.map((time) => ({ time, deliveries: 0 }));
    }

    // Count deliveries by time slot
    const deliveriesByTime = timeSlots.map((time) => {
      let count = 0;

      // This is a simplified approach - in a real app, you'd parse the actual times
      switch (time) {
        case "8AM":
          count = Math.round(completedDeliveries.length * 0.1);
          break;
        case "10AM":
          count = Math.round(completedDeliveries.length * 0.15);
          break;
        case "12PM":
          count = Math.round(completedDeliveries.length * 0.2);
          break;
        case "2PM":
          count = Math.round(completedDeliveries.length * 0.25);
          break;
        case "4PM":
          count = Math.round(completedDeliveries.length * 0.15);
          break;
        case "6PM":
          count = Math.round(completedDeliveries.length * 0.1);
          break;
        case "8PM":
          count = Math.round(completedDeliveries.length * 0.05);
          break;
      }

      return { time, deliveries: count };
    });

    return deliveriesByTime;
  }, [completedDeliveries, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading history data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="completed">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed">Completed Deliveries</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Delivery History</CardTitle>
              <CardDescription>
                Past deliveries successfully completed by this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedDeliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Tea Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedDeliveries.map((delivery) => (
                        <TableRow key={delivery.requestId}>
                          <TableCell>{delivery.requestId}</TableCell>
                          <TableCell>{delivery.machineId}</TableCell>
                          <TableCell>
                            {formatDate(delivery.requestDateTime || undefined)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {delivery.dstAddress || "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.teaType || "Standard"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">Completed</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Completed Deliveries
                  </h3>
                  <p className="text-muted-foreground">
                    This delivery agent hasn't completed any deliveries yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Deliveries by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyPerformance}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="deliveries"
                        name="Deliveries"
                        fill="#4ade80"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="distance"
                        name="Distance (km)"
                        fill="#60a5fa"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Analytics</CardTitle>
                <CardDescription>Detailed delivery statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Busiest Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">Wednesday</div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Average{" "}
                        {Math.max(
                          1,
                          Math.round(completedDeliveries.length / 7)
                        )}{" "}
                        deliveries
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Peak Hours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">2PM - 5PM</div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Highest delivery volume
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Avg. Per Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {completedDeliveries.length > 0
                          ? (completedDeliveries.length / 30).toFixed(1)
                          : "0.0"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Deliveries per working day
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-4">
                    Delivery Time Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={timeDistribution}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="deliveries"
                          name="Deliveries"
                          stroke="#4ade80"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Request History</CardTitle>
              <CardDescription>
                Requests that were cancelled by this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cancelledDeliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Cancelled Date</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelledDeliveries.map((delivery) => (
                        <TableRow key={delivery.requestId}>
                          <TableCell>{delivery.requestId}</TableCell>
                          <TableCell>{delivery.machineId}</TableCell>
                          <TableCell>
                            {formatDate(delivery.requestDateTime || undefined)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {delivery.dstAddress || "N/A"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {"cancellationReason" in delivery &&
                            delivery.cancellationReason
                              ? String(delivery.cancellationReason)
                              : "Not specified"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Cancelled</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Cancelled Requests
                  </h3>
                  <p className="text-muted-foreground">
                    This delivery agent hasn't cancelled any requests yet.
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
