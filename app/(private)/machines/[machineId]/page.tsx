"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertTriangle } from "lucide-react";

// Import the new tab components
import { OverviewTab } from "@/components/machine-details/overview-tab";
import { AnalyticsTab } from "@/components/machine-details/analytics-tab";
import { DetailsTab } from "@/components/machine-details/details-tab";
import { LocationTab } from "@/components/machine-details/location-tab";
import { HistoryTab } from "@/components/machine-details/history-tab";
import { MaintenanceTab } from "@/components/machine-details/maintenance-tab";
import { VideosTab } from "@/components/machine-details/videos-tab";

export default function MachineDetailsPage() {
  const router = useRouter();
  const { machineId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Get all machines and find the one that matches the ID
  const machines = useQuery(api.machines.list) || [];
  const machine = machines.find((m) => m.id === machineId);

  // Get machine data history
  const machineData =
    useQuery(
      api.machines.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Get replenishment requests for this machine
  const requests =
    useQuery(
      api.requests.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Get transactions for this machine
  const transactions =
    useQuery(
      api.transactions.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Calculate transaction metrics
  const transactionMetrics = useMemo(() => {
    if (!transactions.length) {
      return {
        totalCups: 0,
        totalAmount: 0,
        paidTransactions: 0,
        activeTransactions: 0,
        canceledTransactions: 0,
        paidAmount: 0,
        dailySales: [],
        monthlySales: [],
        statusDistribution: [],
      };
    }

    // Filter transactions by status
    const paidTxs = transactions.filter((tx) => tx.status === "paid");
    const activeTxs = transactions.filter((tx) => tx.status === "active");
    const canceledTxs = transactions.filter((tx) => tx.status === "canceled");

    // Calculate totals
    const totalCups = paidTxs.reduce((sum, tx) => sum + tx.cups, 0);
    const totalAmount = paidTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Group by day for daily sales
    const dailySalesMap = new Map();
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    last7Days.forEach((day) => {
      dailySalesMap.set(day, { date: day, cups: 0, amount: 0 });
    });

    paidTxs.forEach((tx) => {
      const date = new Date(tx.createdAt).toISOString().split("T")[0];
      if (dailySalesMap.has(date)) {
        const dayData = dailySalesMap.get(date);
        dayData.cups += tx.cups;
        dayData.amount += tx.amount;
        dailySalesMap.set(date, dayData);
      }
    });

    // Status distribution for pie chart
    const statusDistribution = [
      { name: "Paid", value: paidTxs.length },
      { name: "Active", value: activeTxs.length },
      { name: "Canceled", value: canceledTxs.length },
    ];

    return {
      totalCups,
      totalAmount,
      paidTransactions: paidTxs.length,
      activeTransactions: activeTxs.length,
      canceledTransactions: canceledTxs.length,
      paidAmount: totalAmount,
      dailySales: Array.from(dailySalesMap.values()),
      monthlySales: [],
      statusDistribution,
    };
  }, [transactions]);

  if (!machine) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Machine Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The machine with ID {machineId} could not be found.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const machineWithDefaults = {
    ...machine,
    address: machine.address || {
      building: "N/A",
      floor: "N/A",
      area: "N/A",
      district: "N/A",
      state: "N/A",
    },
  };

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
            <h1 className="text-2xl md:text-3xl font-bold">{machine.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                variant={machine.status === "online" ? "success" : "secondary"}
                className="mr-2"
              >
                {machine.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {machine.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/machines/${machineId}/edit`)}
          >
            Edit Machine
          </Button>
          {/* <Button>Request Refill</Button> */}
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            machine={machineWithDefaults}
            transactionMetrics={transactionMetrics}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab
            transactionMetrics={transactionMetrics}
            transactions={transactions}
          />
        </TabsContent>

        <TabsContent value="details">
          <DetailsTab machine={machine} />
        </TabsContent>

        <TabsContent value="location">
          <LocationTab machine={machine} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab machineData={machineData} requests={requests} />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab machine={machine} />
        </TabsContent>
        <TabsContent value="videos">
          <VideosTab machineId={machine.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
