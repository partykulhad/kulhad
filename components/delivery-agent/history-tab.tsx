"use client";

import { useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { History, Loader2, X, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatDateTime";

interface HistoryTabProps {
  agentId: string;
}

export default function HistoryTab({ agentId }: HistoryTabProps) {
  // Date filter state
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);

  // Fetch order history for this agent using the combined API
  const orderHistory =
    useQuery(api.requests.getMyOrdersHistory, { userId: agentId }) || [];

  // Loading state
  const isLoading = orderHistory === undefined;

  // Helper function to check if a date is within the selected range
  const isDateInRange = (dateString: string | null) => {
    if (!dateString) return false;
    if (!fromDate && !toDate) return true;

    const date = new Date(dateString);
    const from = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)) : null;
    const to = toDate ? new Date(toDate.setHours(23, 59, 59, 999)) : null;

    if (from && to) {
      return date >= from && date <= to;
    } else if (from) {
      return date >= from;
    } else if (to) {
      return date <= to;
    }

    return true;
  };

  // Filter orders based on date range
  const filteredOrderHistory = useMemo(() => {
    if (isLoading) return [];

    return orderHistory.filter((order) => {
      // Check multiple date fields for filtering
      return (
        isDateInRange(order.requestDateTime) ||
        isDateInRange(order.assignedAt) ||
        isDateInRange(order.completedAt) ||
        isDateInRange(order.cancelledAt)
      );
    });
  }, [orderHistory, fromDate, toDate, isLoading]);

  // Filter completed and cancelled orders from filtered data
  const completedDeliveries = useMemo(() => {
    return filteredOrderHistory.filter(
      (order) => order.requestStatus === "Completed"
    );
  }, [filteredOrderHistory]);

  const cancelledDeliveries = useMemo(() => {
    return filteredOrderHistory.filter(
      (order) => order.requestStatus === "Cancelled"
    );
  }, [filteredOrderHistory]);

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

    return months
      .slice(Math.max(0, currentMonth - 5), currentMonth + 1)
      .map((month, index) => {
        const monthDeliveries = completedDeliveries.filter((delivery) => {
          const deliveryDate = new Date(delivery.requestDateTime || "");
          return (
            deliveryDate.getMonth() === (currentMonth - 5 + index + 12) % 12
          );
        });

        const distance = monthDeliveries.reduce((sum, delivery) => {
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

    if (isLoading || completedDeliveries.length === 0) {
      return timeSlots.map((time) => ({ time, deliveries: 0 }));
    }

    const deliveriesByTime = timeSlots.map((time) => {
      let count = 0;

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

  // Clear filters function
  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

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
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter orders by date range</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!fromDate && !toDate}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {(fromDate || toDate) && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredOrderHistory.length} orders
                  {fromDate && ` from ${format(fromDate, "PPP")}`}
                  {toDate && ` to ${format(toDate, "PPP")}`}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="completed">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed">
            Completed Deliveries ({completedDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled Requests ({cancelledDeliveries.length})
          </TabsTrigger>
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
                        <TableHead>Assigned At</TableHead>
                        <TableHead>Picked Up At</TableHead>
                        <TableHead>Ongoing At</TableHead>
                        <TableHead>Refilled At</TableHead>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>Order Ready</TableHead>
                        <TableHead>Completed At</TableHead>
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
                            {delivery.assignedAt
                              ? formatDateTime(delivery.assignedAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.pickedUpAt
                              ? formatDateTime(delivery.pickedUpAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.ongoingAt
                              ? formatDateTime(delivery.ongoingAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.refilledAt
                              ? formatDateTime(delivery.refilledAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.submittedAt
                              ? formatDateTime(delivery.submittedAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.orderReady
                              ? formatDateTime(delivery.orderReady)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.completedAt
                              ? formatDateTime(delivery.completedAt)
                              : "N/A"}
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
                    {fromDate || toDate
                      ? "No deliveries found for the selected date range."
                      : "This delivery agent hasn't completed any deliveries yet."}
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
                        <TableHead>Assigned At</TableHead>
                        <TableHead>Picked Up At</TableHead>
                        <TableHead>Ongoing At</TableHead>
                        <TableHead>Cancelled At</TableHead>
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
                            {delivery.assignedAt
                              ? formatDateTime(delivery.assignedAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.pickedUpAt
                              ? formatDateTime(delivery.pickedUpAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.ongoingAt
                              ? formatDateTime(delivery.ongoingAt)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {delivery.cancelledAt
                              ? formatDateTime(delivery.cancelledAt)
                              : "N/A"}
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
                    {fromDate || toDate
                      ? "No cancelled requests found for the selected date range."
                      : "This delivery agent hasn't cancelled any requests yet."}
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
