"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { MachinesTable } from "@/components/dashboard/machines-table";
import { MachineDetails } from "@/components/dashboard/machine-details";
import AddDeliveryAgent from "@/components/AddDeliveryAgent";
import AddMachineContent from "@/components/AddMachineContent";
import AddVendorContent from "@/components/AddVendorContent";
import VendorsContent from "@/components/VendorsContent";
import AddKitchen from "@/components/add-kitchen";
import Header from "@/components/AuthenticatedHeader";

export default function DashboardPage() {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const machines = useQuery(api.machines.list) || [];
  const vendors = useQuery(api.vendors.list) || [];
  const toggleStatus = useMutation(api.machines.toggleStatus);

  // Calculate overview metrics
  const totalSales = 1234.56; // Replace with actual sales data
  const alerts = {
    low: machines.filter((m) => m.canisterLevel < 20).length,
    maintenance: machines.filter(
      (m) => m.temperature > 75 || m.temperature < 65
    ).length,
  };

  const handleStatusToggle = async (machineId: Id<"machines">) => {
    await toggleStatus({ id: machineId });
  };

  return (
    <>
      <Header
        selectedMachine={selectedMachine}
        setSelectedMachine={setSelectedMachine}
        setActiveTab={setActiveTab}
        vendingMachines={machines}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="container mx-auto space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
            className="w-full"
          >
            <TabsContent value="dashboard">
              <div className="space-y-6">
                <OverviewCards
                  machines={machines}
                  totalSales={totalSales}
                  alerts={alerts}
                />

                {selectedMachine === "all" ? (
                  <MachinesTable
                    machines={machines}
                    onMachineSelect={setSelectedMachine}
                    onStatusToggle={handleStatusToggle}
                  />
                ) : (
                  <MachineDetails
                    machine={machines.find((m) => m._id === selectedMachine)}
                    onStatusToggle={handleStatusToggle}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="vendors">
              <VendorsContent vendors={vendors} />
            </TabsContent>

            <TabsContent value="Kitchen">
              <VendorsContent vendors={vendors} />
            </TabsContent>

            <TabsContent value="addMachine">
              <AddMachineContent />
            </TabsContent>

            <TabsContent value="addVendor">
              <AddVendorContent />
            </TabsContent>

            <TabsContent value="addKitchen">
              <AddKitchen />
            </TabsContent>

            <TabsContent value="deliveryAgents">
              <AddDeliveryAgent />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
