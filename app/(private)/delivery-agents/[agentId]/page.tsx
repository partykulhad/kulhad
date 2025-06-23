"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";

// Import tab components
import OverviewTab from "@/components/delivery-agent/overview-tab";
import PerformanceTab from "@/components/delivery-agent/performance-tab";
import TrackingTab from "@/components/delivery-agent/tracking-tab";
import RequestsTab from "@/components/delivery-agent/requests-tab";
import HistoryTab from "@/components/delivery-agent/history-tab";

export default function DeliveryAgentDetailsPage() {
  const router = useRouter();
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Get the agent details only
  const deliveryAgents = useQuery(api.deliveryAgents.list) || [];
  const agent = deliveryAgents.find((a) => a.userId === agentId);

  if (!agent) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Loading agent data...</h1>
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
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mr-4">
              {agent.photoStorageId ? (
                <img
                  src={`/api/photos/${agent.photoStorageId}`}
                  alt={agent.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{agent.name}</h1>
              <div className="flex items-center mt-1">
                <Badge
                  variant={agent.status === "active" ? "success" : "secondary"}
                  className="mr-2"
                >
                  {agent.status || "Active"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {agent.userId}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/delivery-agents/${agentId}/edit`)}
          >
            Edit Agent
          </Button>
          {/* <Button>Assign Request</Button> */}
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tracking">Location Tracking</TabsTrigger>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="history">Delivery History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab agentId={agent.userId} agent={agent} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab agentId={agent.userId} />
        </TabsContent>

        <TabsContent value="tracking">
          <TrackingTab agentId={agent.userId} agent={agent} />
        </TabsContent>

        <TabsContent value="requests">
          <RequestsTab agentId={agent.userId} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab agentId={agent.userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
