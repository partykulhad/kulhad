"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { deriveCanisterLevel, isMachineOffline, useNow } from "@/lib/utils";
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
import { MachineComparisonChart } from "@/components/charts/machine-comparison-chart";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import RFIDManagement from "@/components/rfid-management";
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
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
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
  const [newFlushTime, setNewFlushTime] = useState<string>("");
  const [isUpdatingFlush, setIsUpdatingFlush] = useState(false);

  const machines = useQuery(api.machines.list) || [];
  const vendors = useQuery(api.vendors.list) || [];
  const toggleStatus = useMutation(api.machines.toggleStatus);
  const now = useNow();

  const globalFlushTime = useQuery(api.globalSettings.getFlushTime);
  const updateGlobalFlushTime = useMutation(api.globalSettings.updateFlushTime);

  useEffect(() => {
    if (globalFlushTime !== undefined && newFlushTime === "") {
      setNewFlushTime(globalFlushTime.toString());
    }
  }, [globalFlushTime]);

  const handleUpdateGlobalFlush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingFlush(true);
    try {
      const parsedTime = Number.parseInt(newFlushTime, 10);
      if (isNaN(parsedTime) || parsedTime < 0) {
        toast.error("Please enter a valid number of minutes");
        return;
      }
      await updateGlobalFlushTime({ flushTimeMinutes: parsedTime });
      toast.success("Global flush time updated for all machines!");
    } catch (error) {
      console.error("Error updating global flush time:", error);
      toast.error("Failed to update flush time");
    } finally {
      setIsUpdatingFlush(false);
    }
  };

  // Calculate overview metrics
  const alerts = {
    low: machines.filter((m) => deriveCanisterLevel(m.cups) < 20).length,
    maintenance: machines.filter((m) => (m.temperature || 0) <= 80).length,
    offline: machines.filter((m) => isMachineOffline(m.status, m.lastSeenAt, now)).length,
    online: machines.filter((m) => !isMachineOffline(m.status, m.lastSeenAt, now)).length,
  };

  const inventoryData = machines.map((machine) => ({
    name: machine.name,
    level: deriveCanisterLevel(machine.cups),
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

                      {/* Global Settings */}
                      <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-pink-50/20 to-rose-50/30 dark:from-purple-900/10 dark:via-pink-900/5 dark:to-rose-900/10" />
                        <CardContent className="relative p-6">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            Global Settings
                          </h3>
                          <form
                            onSubmit={handleUpdateGlobalFlush}
                            className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4"
                          >
                            <div className="flex-1 w-full flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                              <span className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Auto-Flush Timer (Minutes):
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={newFlushTime}
                                onChange={(e) => setNewFlushTime(e.target.value)}
                                className="w-full md:w-48 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g. 40"
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                This setting applies to <b>all machines</b> network-wide.
                              </span>
                            </div>
                            
                            <Button
                              type="submit"
                              disabled={isUpdatingFlush}
                              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {isUpdatingFlush ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Save Config
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Cross-Machine Comparison Chart */}
                      <div className="w-full">
                        <MachineComparisonChart machines={machines} />
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

            <TabsContent value="transactions" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <TransactionsPage />
              </motion.div>
            </TabsContent>

            <TabsContent value="rfid" className="mt-0">
              <motion.div
                initial="initial"
                animate="in"
                variants={pageVariants}
                transition={pageTransition}
              >
                <RFIDManagement />
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
