"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import { TemperatureMonitor } from "@/components/charts/temperature-monitor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboardIcon,
  ArrowLeftIcon,
  TrendingUpIcon,
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BarChart3Icon,
  PieChartIcon,
  Users2Icon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Sample data generators for charts that need sample data
const generateTemperatureData = (hours: number) => {
  return Array.from({ length: hours }).map((_, i) => ({
    time: new Date(
      Date.now() - (hours - 1 - i) * 60 * 60 * 1000
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: Math.floor(Math.random() * 10) + 70 + Math.sin(i / 4) * 5,
  }));
};

export default function DashboardPage() {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const machines = useQuery(api.machines.list) || [];
  const vendors = useQuery(api.vendors.list) || [];
  const toggleStatus = useMutation(api.machines.toggleStatus);

  // Calculate overview metrics
  const alerts = {
    low: machines.filter((m) => (m.canisterLevel || 0) < 20).length,
    maintenance: machines.filter((m) => (m.temperature || 0) <= 80).length,
    offline: machines.filter((m) => m.status === "offline").length,
    online: machines.filter((m) => m.status === "online").length,
  };

  const inventoryData = machines.map((machine) => ({
    name: machine.name,
    level: machine.canisterLevel || 0,
    threshold: 20,
  }));

  const handleStatusToggle = async (machineId: Id<"machines">) => {
    await toggleStatus({ id: machineId });
  };

  const handleBackToOverview = () => {
    setSelectedMachine("all");
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.3,
  };

  const selectedMachineData = machines.find((m) => m._id === selectedMachine);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
      <Header
        selectedMachine={selectedMachine}
        setSelectedMachine={setSelectedMachine}
        setActiveTab={setActiveTab}
        vendingMachines={machines}
      />

      <main className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10" />

        <div className="relative container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
          <Tabs
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
            className="w-full"
          >
            <TabsContent value="dashboard" className="mt-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedMachine}
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="space-y-8"
                >
                  {selectedMachine === "all" ? (
                    // Overview Dashboard
                    <>
                      {/* Overview Cards */}
                      <OverviewCards machines={machines} />

                      {/* Charts Section - Full Width Sales Chart */}
                      <div className="w-full">
                        <SalesChart />
                      </div>

                      {/* Status Overview Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-blue-50/95 dark:from-gray-900/95 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
                          <CardContent className="relative p-4 md:p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                                <LayoutDashboardIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">
                                  {machines.length}
                                </h3>
                                <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400 font-medium">
                                  Total Machines
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-emerald-50/95 dark:from-gray-900/95 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" />
                          <CardContent className="relative p-4 md:p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                                <CheckCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                  {alerts.online}
                                </h3>
                                <p className="text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                  Online Now
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-red-50/95 dark:from-gray-900/95 dark:to-red-900/20 border border-red-200/50 dark:border-red-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5" />
                          <CardContent className="relative p-4 md:p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 shadow-lg">
                                <WifiOffIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-100">
                                  {alerts.offline}
                                </h3>
                                <p className="text-xs md:text-sm text-red-600 dark:text-red-400 font-medium">
                                  Offline
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-amber-50/95 dark:from-gray-900/95 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
                          <CardContent className="relative p-4 md:p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
                                <AlertTriangleIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl md:text-2xl font-bold text-amber-900 dark:text-amber-100">
                                  {alerts.low}
                                </h3>
                                <p className="text-xs md:text-sm text-amber-600 dark:text-amber-400 font-medium">
                                  Low Stock
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Inventory Levels Section */}
                      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-teal-50/20 to-cyan-50/30 dark:from-emerald-900/10 dark:via-teal-900/5 dark:to-cyan-900/10" />
                        <CardContent className="relative p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                                <TrendingUpIcon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  Inventory Levels
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Monitor stock levels across all machines
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700 font-semibold px-3 py-1 rounded-xl">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                {machines.length - alerts.low} Good
                              </Badge>
                              {alerts.low > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="font-semibold px-3 py-1 rounded-xl animate-pulse"
                                >
                                  <AlertTriangleIcon className="h-3 w-3 mr-1" />
                                  {alerts.low} Low
                                </Badge>
                              )}
                            </div>
                          </div>
                          <InventoryLevels data={inventoryData} />
                        </CardContent>
                      </Card>

                      {/* Machines Table */}
                      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-blue-50/20 to-purple-50/30 dark:from-gray-800/30 dark:via-blue-900/10 dark:to-purple-900/10" />
                        <CardContent className="relative p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 shadow-lg">
                              <LayoutDashboardIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                All Machines
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Manage and monitor your vending machines
                              </p>
                            </div>
                          </div>
                          <MachinesTable
                            machines={machines}
                            onMachineSelect={setSelectedMachine}
                            onStatusToggle={handleStatusToggle}
                          />
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    // Individual Machine View
                    <>
                      {/* Back Button and Machine Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                        <Button
                          onClick={handleBackToOverview}
                          variant="outline"
                          className="w-fit bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-600/60 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 rounded-2xl"
                        >
                          <ArrowLeftIcon className="h-4 w-4 mr-2" />
                          Back to Overview
                        </Button>
                        <div className="flex-1">
                          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                            {selectedMachineData?.name}
                          </h1>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {selectedMachineData?.address?.building},{" "}
                            {selectedMachineData?.address?.area}
                          </p>
                        </div>
                      </div>

                      {/* Machine Temperature Chart - Full Width */}
                      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl mb-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-red-50/20 to-pink-50/30 dark:from-orange-900/10 dark:via-red-900/5 dark:to-pink-900/10" />
                        <CardContent className="relative p-6">
                          <TemperatureMonitor
                            data={generateTemperatureData(24)}
                            machineId={selectedMachine}
                            machineName={selectedMachineData?.name || ""}
                          />
                        </CardContent>
                      </Card>

                      {/* Machine Details */}
                      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-blue-50/20 to-purple-50/30 dark:from-gray-800/30 dark:via-blue-900/10 dark:to-purple-900/10" />
                        <CardContent className="relative p-6">
                          <MachineDetails
                            machine={selectedMachineData}
                            onStatusToggle={handleStatusToggle}
                          />
                        </CardContent>
                      </Card>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Other Tab Contents */}
            <TabsContent value="vendors" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <VendorsContent vendors={vendors} />
              </motion.div>
            </TabsContent>

            <TabsContent value="Kitchen" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <VendorsContent vendors={vendors} />
              </motion.div>
            </TabsContent>

            <TabsContent value="addMachine" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AddMachineContent />
              </motion.div>
            </TabsContent>

            <TabsContent value="addVendor" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AddVendorContent />
              </motion.div>
            </TabsContent>

            <TabsContent value="addKitchen" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AddKitchen />
              </motion.div>
            </TabsContent>

            <TabsContent value="deliveryAgents" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AddDeliveryAgent />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(
              rgba(0, 0, 0, 0.1) 1px,
              transparent 1px
            ),
            linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
