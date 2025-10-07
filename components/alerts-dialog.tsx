"use client";

import {
  AlertCircleIcon,
  WifiOffIcon,
  ThermometerIcon,
  DropletIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface Machine {
  _id: string;
  name: string;
  status?: string;
  temperature?: number;
  canisterLevel?: number;
  lastChecked?: string;
  address?: {
    building: string;
    area: string;
  };
}

interface AlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machines: Machine[];
  onMachineSelect: (machineId: string) => void;
  setActiveTab: (tab: string) => void;
}

export function AlertsDialog({
  open,
  onOpenChange,
  machines,
  onMachineSelect,
  setActiveTab,
}: AlertsDialogProps) {
  const offlineMachines = machines.filter((m) => m.status === "offline");
  const lowInventoryMachines = machines.filter(
    (m) => (m.canisterLevel || 0) < 20
  );
  const temperatureAlerts = machines.filter((m) => {
    const temp = m.temperature || 0;
    return temp <= 80;
  });

  const totalAlerts =
    offlineMachines.length +
    lowInventoryMachines.length +
    temperatureAlerts.length;

  const handleMachineClick = (machineId: string) => {
    onMachineSelect(machineId);
    setActiveTab("dashboard");
    onOpenChange(false);
  };

  const getAlertIcon = (type: "offline" | "inventory" | "temperature") => {
    switch (type) {
      case "offline":
        return <WifiOffIcon className="h-4 w-4" />;
      case "inventory":
        return <DropletIcon className="h-4 w-4" />;
      case "temperature":
        return <ThermometerIcon className="h-4 w-4" />;
      default:
        return <AlertCircleIcon className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: "offline" | "inventory" | "temperature") => {
    switch (type) {
      case "offline":
        return "from-gray-500/10 to-gray-600/10 border-gray-200";
      case "inventory":
        return "from-red-500/10 to-red-600/10 border-red-200";
      case "temperature":
        return "from-amber-500/10 to-orange-600/10 border-amber-200";
      default:
        return "from-gray-500/10 to-gray-600/10 border-gray-200";
    }
  };

  const AlertCard = ({
    machine,
    type,
  }: {
    machine: Machine;
    type: "offline" | "inventory" | "temperature";
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full mb-4"
      >
        <Card
          className={`group hover:shadow-lg transition-all duration-300 border bg-gradient-to-br ${getAlertColor(type)} hover:scale-[1.01]`}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      type === "offline"
                        ? "bg-gray-100"
                        : type === "inventory"
                          ? "bg-red-100"
                          : "bg-amber-100"
                    }`}
                  >
                    {getAlertIcon(type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {machine.name}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">
                      {machine.address?.building}, {machine.address?.area}
                    </p>
                  </div>
                </div>
              </div>

              <Badge
                variant={
                  type === "offline"
                    ? "secondary"
                    : type === "inventory"
                      ? "destructive"
                      : "default"
                }
                className="flex-shrink-0"
              >
                {type === "offline"
                  ? "Offline"
                  : type === "inventory"
                    ? "Low Stock"
                    : "High Temp"}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {type === "offline" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertTriangleIcon className="h-3 w-3" />
                  <span>Last seen: {machine.lastChecked || "Unknown"}</span>
                </div>
              )}
              {type === "inventory" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DropletIcon className="h-3 w-3" />
                  <span>Level: {machine.canisterLevel}%</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${machine.canisterLevel || 0}%` }}
                    />
                  </div>
                </div>
              )}
              {type === "temperature" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ThermometerIcon className="h-3 w-3" />
                  <span>Temperature: {machine.temperature}°C</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      (machine.temperature || 0) <= 60
                        ? "bg-blue-100 text-blue-800"
                        : (machine.temperature || 0) <= 80
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {(machine.temperature || 0) <= 60
                      ? "Low"
                      : (machine.temperature || 0) <= 80
                        ? "Warning"
                        : "Critical"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMachineClick(machine._id)}
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const EmptyState = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-green-100 mb-4">
        <AlertCircleIcon className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="font-medium text-gray-900 mb-2">No {type} alerts</h3>
      <p className="text-sm text-gray-500">All systems are running smoothly</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-5xl h-[90vh] max-h-[900px] p-0 gap-0 overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                System Alerts
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Monitor and manage alerts from your vending machines
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/50">
                {totalAlerts} Active
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs and Content Area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <Tabs defaultValue="all" className="flex flex-col h-full">
            {/* Fixed Tabs Header */}
            <div className="px-6 py-4 border-b bg-white flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <AlertCircleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">All Alerts</span>
                  <span className="sm:hidden">All</span>
                  <Badge variant="secondary" className="ml-1">
                    {totalAlerts}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="offline"
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <WifiOffIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Offline</span>
                  <span className="sm:hidden">Off</span>
                  <Badge variant="secondary" className="ml-1">
                    {offlineMachines.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <DropletIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Inventory</span>
                  <span className="sm:hidden">Stock</span>
                  <Badge variant="secondary" className="ml-1">
                    {lowInventoryMachines.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="temperature"
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ThermometerIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Temperature</span>
                  <span className="sm:hidden">Temp</span>
                  <Badge variant="secondary" className="ml-1">
                    {temperatureAlerts.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-hidden min-h-0">
              <ScrollArea
                className="h-full w-full"
                style={{ height: "calc(90vh - 180px)" }}
              >
                <div className="p-6 pb-8">
                  <TabsContent value="all" className="mt-0 space-y-0">
                    <AnimatePresence mode="wait">
                      {totalAlerts === 0 ? (
                        <EmptyState type="active" />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {offlineMachines.map((machine) => (
                            <AlertCard
                              key={`offline-${machine._id}`}
                              machine={machine}
                              type="offline"
                            />
                          ))}
                          {lowInventoryMachines.map((machine) => (
                            <AlertCard
                              key={`inventory-${machine._id}`}
                              machine={machine}
                              type="inventory"
                            />
                          ))}
                          {temperatureAlerts.map((machine) => (
                            <AlertCard
                              key={`temperature-${machine._id}`}
                              machine={machine}
                              type="temperature"
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="offline" className="mt-0 space-y-0">
                    <AnimatePresence mode="wait">
                      {offlineMachines.length === 0 ? (
                        <EmptyState type="offline" />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {offlineMachines.map((machine) => (
                            <AlertCard
                              key={machine._id}
                              machine={machine}
                              type="offline"
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="inventory" className="mt-0 space-y-0">
                    <AnimatePresence mode="wait">
                      {lowInventoryMachines.length === 0 ? (
                        <EmptyState type="inventory" />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {lowInventoryMachines.map((machine) => (
                            <AlertCard
                              key={machine._id}
                              machine={machine}
                              type="inventory"
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </TabsContent>

                  <TabsContent value="temperature" className="mt-0 space-y-0">
                    <AnimatePresence mode="wait">
                      {temperatureAlerts.length === 0 ? (
                        <EmptyState type="temperature" />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {temperatureAlerts.map((machine) => (
                            <AlertCard
                              key={machine._id}
                              machine={machine}
                              type="temperature"
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
