"use client";

import {
  AlertCircleIcon,
  WifiOffIcon,
  ThermometerIcon,
  DropletIcon,
  XIcon,
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

  const handleMachineClick = (machineId: string) => {
    onMachineSelect(machineId);
    setActiveTab("dashboard");
    onOpenChange(false);
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
        className="p-4 border rounded-lg mb-3 hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="font-medium">{machine.name}</h4>
            <p className="text-sm text-muted-foreground">
              {machine.address?.building}, {machine.address?.area}
            </p>
          </div>
          <Badge
            variant={
              type === "offline"
                ? "secondary"
                : type === "inventory"
                  ? "destructive"
                  : "warning"
            }
          >
            {type === "offline"
              ? "Offline"
              : type === "inventory"
                ? "Low Inventory"
                : "Temperature Alert"}
          </Badge>
        </div>

        <div className="mt-3 space-y-2">
          {type === "offline" && (
            <p className="text-sm text-muted-foreground">
              Last online: {machine.lastChecked || "Unknown"}
            </p>
          )}
          {type === "inventory" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DropletIcon className="h-4 w-4" />
              <span>Canister Level: {machine.canisterLevel}%</span>
            </div>
          )}
          {type === "temperature" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ThermometerIcon className="h-4 w-4" />
              <span>Temperature: {machine.temperature}°C</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMachineClick(machine._id)}
          >
            View Details
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>System Alerts</DialogTitle>
          <DialogDescription>
            Current alerts and warnings from your vending machines
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1">
          <TabsList>
            <TabsTrigger value="all">
              All Alerts
              <Badge variant="secondary" className="ml-2">
                {offlineMachines.length +
                  lowInventoryMachines.length +
                  temperatureAlerts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="offline">
              Offline
              <Badge variant="secondary" className="ml-2">
                {offlineMachines.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inventory">
              Inventory
              <Badge variant="secondary" className="ml-2">
                {lowInventoryMachines.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="temperature">
              Temperature
              <Badge variant="secondary" className="ml-2">
                {temperatureAlerts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4 pr-4">
            <TabsContent value="all" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="offline">
              {offlineMachines.map((machine) => (
                <AlertCard key={machine._id} machine={machine} type="offline" />
              ))}
            </TabsContent>

            <TabsContent value="inventory">
              {lowInventoryMachines.map((machine) => (
                <AlertCard
                  key={machine._id}
                  machine={machine}
                  type="inventory"
                />
              ))}
            </TabsContent>

            <TabsContent value="temperature">
              {temperatureAlerts.map((machine) => (
                <AlertCard
                  key={machine._id}
                  machine={machine}
                  type="temperature"
                />
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
