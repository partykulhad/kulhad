"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ThermometerIcon,
  MapPinIcon,
  ClockIcon,
  DropletIcon,
  StarIcon,
  TruckIcon,
} from "lucide-react";
import { deriveCanisterLevel, isMachineUnreachable, useNow, isWithinTimeWindow } from "@/lib/utils";

interface MachineDetailsProps {
  machine: any; // Update this with proper type
  onStatusToggle: (machine: any) => void;
}

export function MachineDetails({
  machine,
  onStatusToggle,
}: MachineDetailsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const now = useNow();
  const goingOnline = machine.status === "offline" || isMachineUnreachable(machine.status, machine.lastSeenAt, now);
  const isNonOperatingHours = isWithinTimeWindow(machine?.serviceRefillStart, machine?.serviceRefillEnd);
  
  const triggerDispense = useMutation(api.machines.triggerRemoteDispense);
  const [isDispensing, setIsDispensing] = useState(false);

  const handleTestDispense = async () => {
    setIsDispensing(true);
    try {
      await triggerDispense({ machineId: machine.id });
      toast.success("Test dispense command sent to machine");
    } catch (error) {
      toast.error("Failed to send dispense command");
    } finally {
      setIsDispensing(false);
    }
  };

  const handleConfirm = () => {
    onStatusToggle(machine);
    setConfirmOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{machine.name}</CardTitle>
            <p className="text-sm text-muted-foreground">ID: {machine.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={
                isMachineUnreachable(machine.status, machine.lastSeenAt, now)
                  ? "destructive"
                  : machine.status === "online"
                    ? "success"
                    : "destructive"
              }
              className="capitalize"
            >
              {isMachineUnreachable(machine.status, machine.lastSeenAt, now)
                ? "offline"
                : machine.status}
            </Badge>
            <div title={isNonOperatingHours ? "Cannot toggle during non-operating hours" : undefined}>
              <Switch
                disabled={isNonOperatingHours}
                checked={machine.status === "online" && !isMachineUnreachable(machine.status, machine.lastSeenAt, now)}
                onCheckedChange={() => {
                  if (!isNonOperatingHours) setConfirmOpen(true);
                }}
              />
            </div>
          </div>
        </CardHeader>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Take this machine {goingOnline ? "online" : "offline"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {goingOnline
                  ? `${machine.name} will start heating and accepting orders.`
                  : `${machine.name} will stop accepting orders and the kiosk will show the maintenance screen.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Temperature
                    </CardTitle>
                    <ThermometerIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {machine.temperature}°C
                    </div>
                    <Badge
                      variant={
                        machine.temperature > 75
                          ? "destructive"
                          : machine.temperature < 65
                            ? "warning"
                            : "default"
                      }
                      className="mt-1"
                    >
                      {machine.temperature > 75
                        ? "Too Hot"
                        : machine.temperature < 65
                          ? "Too Cold"
                          : "Optimal"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Canister Level
                    </CardTitle>
                    <DropletIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {deriveCanisterLevel(machine.cups)}%
                    </div>
                    <Progress value={deriveCanisterLevel(machine.cups)} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rating
                    </CardTitle>
                    <StarIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{machine.rating}/5</div>
                    <div className="flex mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < machine.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Machine Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Model
                      </p>
                      <p>{machine.model}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Installed Date
                      </p>
                      <p>{machine.installedDate || "Not specified"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Price per Cup
                      </p>
                      <p>{machine.price || "Not specified"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Operating Hours
                      </p>
                      <p>
                        {machine.startTime || "00:00"} -{" "}
                        {machine.endTime || "24:00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        Operational Settings
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Flush Time
                        </p>
                        <p>{machine.flushTimeMinutes || 0} minutes</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Dispense Amount
                        </p>
                        <p>{machine.mlToDispense || 0}ml</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TruckIcon className="h-4 w-4" />
                        Replenishment Details
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge
                          variant={
                            machine.replenishmentOrder.status === "Urgent"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {machine.replenishmentOrder.status}
                        </Badge>
                      </div>
                      {machine.replenishmentOrder.eta && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">ETA</p>
                          <p>{machine.replenishmentOrder.eta}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="location">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {machine.address.building}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Floor {machine.address.floor}, {machine.address.area}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {machine.address.district}, {machine.address.state}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Latitude
                        </p>
                        <p>{machine.gisLatitude}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Longitude
                        </p>
                        <p>{machine.gisLongitude}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Last Maintenance</h3>
                      <p>{machine.lastFulfilled}</p>
                    </div>
                    {machine.deliveryBoy && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Assigned Technician
                        </h3>
                        <div className="flex items-center gap-4">
                          <div>
                            <p>{machine.deliveryBoy.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Location: {machine.deliveryBoy.location}
                            </p>
                            {machine.deliveryBoy.eta && (
                              <p className="text-sm text-muted-foreground">
                                ETA: {machine.deliveryBoy.eta}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {machine.slo && (
                      <div>
                        <h3 className="font-semibold mb-2">
                          Service Level Objectives
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Uptime
                            </p>
                            <Progress
                              value={machine.slo.uptime}
                              className="mt-1"
                            />
                            <p className="text-sm mt-1">
                              {machine.slo.uptime}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Response Time
                            </p>
                            <p>{machine.slo.responseTime}ms</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Availability Target
                            </p>
                            <p>{machine.slo.availabilityTarget}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
