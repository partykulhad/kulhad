"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "@/components/AuthenticatedHeader";
import DashboardContent from "@/components/DashboardContent";
import VendorsContent from "@/components/VendorsContent";
import AddMachineContent from "@/components/AddMachineContent";
import AddVendorContent from "@/components/AddVendorContent";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import AddDeliveryAgent from "@/components/AddDeliveryAgent";

export default function TeaVendingDashboard() {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const vendingMachines = useQuery(api.machines.list) || [];
  const vendors = useQuery(api.vendors.list) || [];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900 dark:to-teal-800">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Header
        selectedMachine={selectedMachine}
        setSelectedMachine={setSelectedMachine}
        setActiveTab={setActiveTab}
        vendingMachines={vendingMachines}
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="container mx-auto space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
            className="w-full"
          >
            <TabsContent value="dashboard">
              <DashboardContent
                selectedMachine={selectedMachine}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                vendingMachines={vendingMachines}
              />
            </TabsContent>
            <TabsContent value="vendors">
              <VendorsContent vendors={vendors} />
            </TabsContent>
            <TabsContent value="addMachine">
              <AddMachineContent />
            </TabsContent>
            <TabsContent value="addVendor">
              <AddVendorContent />
            </TabsContent>
            <TabsContent value="deliveryAgents">
              <AddDeliveryAgent />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
