"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { MachinesTable } from "@/components/dashboard/machines-table";
import { MachineDetails } from "@/components/dashboard/machine-details";
import AddMachineContent from "@/components/AddMachineContent";
import AddVendorContent from "@/components/AddVendorContent";
import VendorsContent from "@/components/VendorsContent";
import AddKitchen from "@/components/add-kitchen";
import Header from "@/components/AuthenticatedHeader";
import AddDeliveryAgent from "@/components/AddDeliveryAgent";
import { InventoryLevels } from "@/components/charts/inventory-levels";
import { SalesChart } from "@/components/charts/sales-chart";
import { StatusDistribution } from "@/components/charts/status-distribution";
import { TemperatureMonitor } from "@/components/charts/temperature-monitor";

// Sample data generators
const generateSalesData = (days: number) => {
  return Array.from({ length: days }).map((_, i) => ({
    date: new Date(
      Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000
    ).toLocaleDateString(),
    sales: Math.floor(Math.random() * 1000) + 500,
    cups: Math.floor(Math.random() * 200) + 100,
  }));
};

const generateTemperatureData = (hours: number) => {
  return Array.from({ length: hours }).map((_, i) => ({
    time: new Date(
      Date.now() - (hours - 1 - i) * 60 * 60 * 1000
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: Math.floor(Math.random() * 10) + 65,
  }));
};

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
  const totalSales = 1234.56;
  const alerts = {
    low: machines.filter((m) => m.canisterLevel < 20).length,
    maintenance: machines.filter((m) => m.temperature <= 80).length,
  };

  // Prepare chart data
  const statusData = [
    {
      name: "Online",
      value: machines.filter((m) => m.status === "online").length,
      color: "#16a34a",
    },
    {
      name: "Offline",
      value: machines.filter((m) => m.status === "offline").length,
      color: "#dc2626",
    },
    { name: "Maintenance", value: alerts.maintenance, color: "#ca8a04" },
  ];

  const inventoryData = machines.map((machine) => ({
    name: machine.name,
    level: machine.canisterLevel,
    threshold: 20,
  }));

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SalesChart data={generateSalesData(7)} />
                  <StatusDistribution data={statusData} />
                </div>

                {selectedMachine === "all" ? (
                  <>
                    <InventoryLevels data={inventoryData} />
                    <MachinesTable
                      machines={machines}
                      onMachineSelect={setSelectedMachine}
                      onStatusToggle={handleStatusToggle}
                    />
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <TemperatureMonitor
                        data={generateTemperatureData(24)}
                        machineId={selectedMachine}
                        machineName={
                          machines.find((m) => m._id === selectedMachine)
                            ?.name || ""
                        }
                      />
                      <StatusDistribution data={statusData} />
                    </div>
                    <MachineDetails
                      machine={machines.find((m) => m._id === selectedMachine)}
                      onStatusToggle={handleStatusToggle}
                    />
                  </>
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
