"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { differenceInDays, subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  Truck,
  History,
  Clock,
  FileText,
  Briefcase,
  CreditCard,
  Star,
  Route,
  Timer,
  Zap,
  Award,
  Loader2,
} from "lucide-react";
import {
  formatDate,
  formatDistance,
  formatDuration,
  parseRequestDate,
  isToday,
} from "@/lib/format";

interface OverviewTabProps {
  agentId: string;
  agent: any;
}

export default function OverviewTab({ agentId, agent }: OverviewTabProps) {
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
        todayDistance: 0,
        avgDeliveryTime: 0,
        avgRating: 0,
        deliveriesThisWeek: 0,
        deliveriesThisMonth: 0,
        deliveriesToday: 0,
      };
    }

    // Filter completed requests - use only capitalized status
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
    let todayDistance = 0;
    let totalDuration = 0;

    completedDeliveries.forEach((delivery) => {
      if (delivery.totalDistance) {
        totalDistance += delivery.totalDistance;

        // Check if delivery was completed today
        const deliveryDate = parseRequestDate(delivery.requestDateTime);
        if (deliveryDate && isToday(deliveryDate)) {
          todayDistance += delivery.totalDistance;
        }
      }

      // Estimate duration based on distance (assuming 20 km/h average speed)
      const estimatedDuration = delivery.totalDistance
        ? Math.round((delivery.totalDistance / 20) * 60)
        : 0;
      totalDuration += estimatedDuration;
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

    return {
      totalDeliveries: completedDeliveries.length,
      totalDistance: totalDistance,
      todayDistance: todayDistance,
      avgDeliveryTime: completedDeliveries.length
        ? totalDuration / completedDeliveries.length
        : 0,
      avgRating: 4.5, // Placeholder since we don't have ratings in the schema
      deliveriesToday,
      deliveriesThisWeek,
      deliveriesThisMonth,
    };
  }, [requests, isLoading]);

  // Calculate efficiency score (0-100)
  const efficiencyScore = useMemo(() => {
    if (isLoading || !performanceMetrics.totalDeliveries) return 0;

    // Base score on average delivery time, rating, and completion rate
    const timeScore = Math.min(
      100,
      100 - (performanceMetrics.avgDeliveryTime - 30) / 2
    );
    const ratingScore = performanceMetrics.avgRating * 20; // 5 star = 100

    // Calculate completion rate (completed vs cancelled) - use only capitalized status
    const completedCount = performanceMetrics.totalDeliveries;
    const cancelledCount = requests.filter(
      (r) => r.requestStatus === "Cancelled"
    ).length;
    const completionRate =
      completedCount / (completedCount + cancelledCount || 1);
    const completionScore = completionRate * 100;

    return Math.round((timeScore + ratingScore + completionScore) / 3);
  }, [performanceMetrics, requests, isLoading]);

  // Get completed deliveries for the table - use only capitalized status
  const completedDeliveries = useMemo(() => {
    if (isLoading) return [];

    return requests
      .filter((r) => r.requestStatus === "Completed")
      .sort((a, b) => {
        const dateA = parseRequestDate(a.requestDateTime);
        const dateB = parseRequestDate(b.requestDateTime);

        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [requests, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Delivery Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-2xl font-bold">
                {performanceMetrics.totalDeliveries}
              </span>
            </div>
            <div className="flex items-center mt-2">
              <Route className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-xl font-medium">
                {formatDistance(performanceMetrics.totalDistance)}
              </span>
            </div>
            <div className="flex items-center mt-2">
              <Calendar className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-sm font-medium">
                Today: {formatDistance(performanceMetrics.todayDistance)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total completed deliveries and distance traveled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {performanceMetrics.deliveriesToday}
                </p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {performanceMetrics.deliveriesThisWeek}
                </p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <History className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {performanceMetrics.deliveriesThisMonth}
                </p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Performance Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              <span className="text-2xl font-bold">
                {performanceMetrics.avgRating.toFixed(1)}/5.0
              </span>
            </div>
            <div className="flex items-center mt-2">
              <Timer className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-xl font-medium">
                {formatDuration(performanceMetrics.avgDeliveryTime)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average rating and delivery time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Efficiency Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{efficiencyScore}%</span>
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
              Based on delivery time, ratings, and completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-lg">{agent.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Mobile</p>
                <p className="text-lg">{agent.mobile}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-lg">{agent.email}</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-lg">{agent.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Briefcase className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Company</p>
                <p className="text-lg">{agent.company}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Starting Date</p>
                <p className="text-lg">{formatDate(agent.startingDate)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">UID</p>
                <p className="text-lg">{agent.uid}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Award className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Experience</p>
                <p className="text-lg">
                  {agent.startingDate
                    ? `${
                        differenceInDays(
                          new Date(),
                          new Date(agent.startingDate)
                        ) /
                          365 >
                        1
                          ? Math.floor(
                              differenceInDays(
                                new Date(),
                                new Date(agent.startingDate)
                              ) / 365
                            ) + " years"
                          : Math.floor(
                              differenceInDays(
                                new Date(),
                                new Date(agent.startingDate)
                              ) / 30
                            ) + " months"
                      }`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Truck className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">Vehicle Type</p>
                <p className="text-lg">Two Wheeler</p>
              </div>
            </div>
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">Vehicle Number</p>
                <p className="text-lg">MH-01-AB-1234</p>
              </div>
            </div>
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">License Number</p>
                <p className="text-lg">DL-1234567890</p>
              </div>
            </div>
            <div className="flex items-center">
              <Zap className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="flex items-center">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${agent.status === "active" ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                  <p className="text-lg">{agent.status || "Active"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Deliveries</CardTitle>
          <CardDescription>Last 5 completed deliveries</CardDescription>
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
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedDeliveries.map((delivery) => (
                    <TableRow key={delivery.requestId}>
                      <TableCell>{delivery.requestId}</TableCell>
                      <TableCell>{delivery.machineId}</TableCell>
                      <TableCell>
                        {formatDate(delivery.requestDateTime)}
                      </TableCell>
                      <TableCell>
                        {delivery.totalDistance
                          ? formatDistance(delivery.totalDistance)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">Completed</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>Documents & Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Identity Documents
              </h3>
              <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Adhaar Card</span>
                  </div>
                  <span className="font-medium">{agent.adhaar}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>PAN Card</span>
                  </div>
                  <span className="font-medium">{agent.pan}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Driving License</span>
                  </div>
                  <span className="font-medium">DL-1234567890</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Login Credentials
              </h3>
              <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Username</span>
                  </div>
                  <span className="font-medium">{agent.username}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Password</span>
                  </div>
                  <span className="font-medium">••••••••</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>Mobile</span>
                  </div>
                  <span className="font-medium">{agent.mobile}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            View Document Copies
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
