"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  History,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { KitchenStats } from "@/components/kitchen-sections/kitchen-stats";
import { RequestsTable } from "@/components/kitchen-sections/requests-table";
import { MembersList } from "@/components/kitchen-sections/members-list";
import { RequestStatusChart } from "@/components/kitchen-sections/request-status-chart";
import { TeaQuantityChart } from "@/components/kitchen-sections/tea-quantity-chart";
import { MachineRefillStats } from "@/components/kitchen-sections/machine-refill-stats";

export default function KitchenDetailsPage() {
  const router = useRouter();
  const { kitchenId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");

  // Get all kitchens and find the one that matches the userId
  const kitchens = useQuery(api.kitchens.list) || [];
  const kitchen = kitchens.find((k) => k.userId === kitchenId);

  // Get requests for this kitchen
  const requests =
    useQuery(
      api.requests.getByKitchenUserId,
      kitchen ? { kitchenUserId: kitchen.userId } : { kitchenUserId: "" }
    ) || [];

  // Get request status updates for canceled requests
  const requestStatusUpdates = useQuery(api.requestStatusUpdates.list) || [];

  // Filter requests by status
  const activeRequests = requests.filter(
    (r) => r.requestStatus === "Pending" || r.requestStatus === "OrderReady"
  );
  const completedRequests = requests.filter(
    (r) => r.requestStatus === "Completed"
  );

  // Get canceled requests from requestStatusUpdates
  const canceledRequestIds = [
    ...new Set(
      requestStatusUpdates
        .filter((update) => update.status === "Canceled")
        .map((update) => update.requestId)
    ),
  ];

  const canceledRequests = requests.filter((r) =>
    canceledRequestIds.includes(r.requestId)
  );

  // Define interface for machine stats
  interface TeaTypeRecord {
    [teaType: string]: number;
  }

  interface MachineStatData {
    totalQuantity: number;
    count: number;
    teaTypes: TeaTypeRecord;
  }

  interface MachineStats {
    [machineId: string]: MachineStatData;
  }

  // Calculate statistics
  const calculateStats = () => {
    // Filter requests based on selected timeframe
    let filteredRequests = [...completedRequests];

    if (selectedTimeframe === "day") {
      const yesterday = subDays(new Date(), 1);
      filteredRequests = filteredRequests.filter(
        (r) =>
          new Date(r.requestDateTime).getDate() === yesterday.getDate() &&
          new Date(r.requestDateTime).getMonth() === yesterday.getMonth() &&
          new Date(r.requestDateTime).getFullYear() === yesterday.getFullYear()
      );
    } else if (selectedTimeframe === "month") {
      const currentMonth = new Date();
      const firstDay = startOfMonth(currentMonth);
      const lastDay = endOfMonth(currentMonth);

      filteredRequests = filteredRequests.filter((r) => {
        const requestDate = new Date(r.requestDateTime);
        return requestDate >= firstDay && requestDate <= lastDay;
      });
    }

    // Group by machine ID and calculate total quantity
    const machineStats: MachineStats = filteredRequests.reduce(
      (acc: MachineStats, request) => {
        const machineId = request.machineId;
        const quantity = request.quantity || 0;

        if (!acc[machineId]) {
          acc[machineId] = {
            totalQuantity: 0,
            count: 0,
            teaTypes: {},
          };
        }

        acc[machineId].totalQuantity += quantity;
        acc[machineId].count += 1;

        // Track tea types
        if (request.teaType) {
          if (!acc[machineId].teaTypes[request.teaType]) {
            acc[machineId].teaTypes[request.teaType] = 0;
          }
          acc[machineId].teaTypes[request.teaType] += quantity;
        }

        return acc;
      },
      {}
    );

    return {
      machineStats,
      totalRefills: filteredRequests.length,
      totalQuantity: filteredRequests.reduce(
        (sum, r) => sum + (r.quantity || 0),
        0
      ),
    };
  };

  const stats = calculateStats();

  if (!kitchen) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Loading kitchen data...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{kitchen.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                variant={kitchen.status === "active" ? "success" : "secondary"}
                className="mr-2"
              >
                {kitchen.status || "Active"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {kitchen.userId}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/kitchens/${kitchenId}/edit`)}
          >
            Edit Kitchen
          </Button>
          <Button>Assign Request</Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="active-requests">Active Requests</TabsTrigger>
          <TabsTrigger value="history">Request History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <KitchenStats
            kitchen={kitchen}
            activeRequests={activeRequests}
            completedRequests={completedRequests}
            canceledRequests={canceledRequests}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Status Distribution</CardTitle>
                <CardDescription>Overview of request statuses</CardDescription>
              </CardHeader>
              <CardContent className="h-90">
                <RequestStatusChart
                  pending={
                    requests.filter((r) => r.requestStatus === "Pending").length
                  }
                  orderReady={
                    requests.filter((r) => r.requestStatus === "OrderReady")
                      .length
                  }
                  completed={completedRequests.length}
                  canceled={canceledRequests.length}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tea Quantity by Type</CardTitle>
                <CardDescription>
                  Distribution of tea types refilled
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <TeaQuantityChart requests={completedRequests} />
              </CardContent>
            </Card>
          </div>

          <MachineRefillStats
            stats={stats}
            timeframe={selectedTimeframe}
            onTimeframeChange={setSelectedTimeframe}
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MembersList members={kitchen.members} />
        </TabsContent>

        <TabsContent value="active-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                Requests waiting to be processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestsTable
                requests={requests.filter((r) => r.requestStatus === "Pending")}
                statusUpdates={requestStatusUpdates}
                emptyMessage="No pending requests at the moment"
                emptyIcon={
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready Orders</CardTitle>
              <CardDescription>
                Orders that are ready for delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestsTable
                requests={requests.filter(
                  (r) => r.requestStatus === "OrderReady"
                )}
                statusUpdates={requestStatusUpdates}
                emptyMessage="No orders ready for delivery"
                emptyIcon={
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
              <CardDescription>Successfully completed requests</CardDescription>
            </CardHeader>
            <CardContent>
              <RequestsTable
                requests={completedRequests}
                statusUpdates={requestStatusUpdates}
                emptyMessage="No completed requests yet"
                emptyIcon={
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canceled Requests</CardTitle>
              <CardDescription>Requests that were canceled</CardDescription>
            </CardHeader>
            <CardContent>
              <RequestsTable
                requests={canceledRequests}
                statusUpdates={requestStatusUpdates}
                showCancelReason={true}
                emptyMessage="No canceled requests"
                emptyIcon={
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
