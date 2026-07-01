"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Address {
  building: string;
  floor: string;
  area: string;
  district: string;
  state: string;
}

interface Machine {
  _id?: Id<"machines"> | undefined;
  id: string;
  name: string;
  description: string;
  model: string;
  address: Address;
  gisLatitude: string;
  gisLongitude: string;
  price?: string;
  startTime?: string;
  endTime?: string;
  serviceRefillStart?: string;
  serviceRefillEnd?: string;
  installedDate?: string;
  status?: string;
  temperature?: number;
  rating?: number;
  canisterLevel?: number;
  replenishmentOrder?: { status: string; eta: string | null };
  deliveryBoy?: any | null;
  lastFulfilled?: string;
  flushTimeMinutes?: number | "";
  cups?: number | "";
  mlToDispense?: number | "";
  lockPass?: string;
  kitchenId?: string;
}

export default function EditMachinePage() {
  const router = useRouter();
  const { machineId } = useParams();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [machine, setMachine] = useState<Machine>({
    _id: undefined,
    id: "",
    name: "",
    description: "",
    model: "",
    address: {
      building: "",
      floor: "",
      area: "",
      district: "",
      state: "",
    },
    gisLatitude: "",
    gisLongitude: "",
    price: "",
    cups: "",
    startTime: "",
    endTime: "",
    serviceRefillStart: "",
    serviceRefillEnd: "",
    flushTimeMinutes: "",
    mlToDispense: "",
    lockPass: "",
    kitchenId: "",
  });

  const machines = useQuery(api.machines.list) || [];
  const kitchens = useQuery(api.kitchens.list) || [];
  const editMachine = useMutation(api.machines.update);
  const logAction = useMutation(api.adminAuditLogs.logAction);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;
    const foundMachine = machines.find((m) => m.id === machineId);
    if (foundMachine) {
      setMachine({
        ...foundMachine,
        price: foundMachine.price || "",
        startTime: foundMachine.startTime || "",
        endTime: foundMachine.endTime || "",
        serviceRefillStart: (foundMachine as any).serviceRefillStart || "",
        serviceRefillEnd: (foundMachine as any).serviceRefillEnd || "",
        cups: foundMachine.cups ?? "",
        mlToDispense: foundMachine.mlToDispense ?? "",
        lockPass: foundMachine.lockPass || "",
        kitchenId: foundMachine.kitchenId || "",
      });
      setIsInitialized(true);
    }
  }, [machines, machineId, isInitialized]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1] as keyof Address;
      setMachine((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setMachine((prev) => ({
        ...prev,
        [name]:
          name === "mlToDispense" ||
          name === "cups"
            ? value === ""
              ? ""
              : Number.parseInt(value, 10)
            : value,
      }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setMachine((prev) => ({
      ...prev,
      installedDate: date?.toISOString(),
    }));
    setIsCalendarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine._id) {
      toast.error("Machine ID not found");
      return;
    }

    setIsLoading(true);
    try {
      await editMachine({
        machineId: machine._id,
        name: machine.name,
        description: machine.description,
        model: machine.model,
        installedDate: machine.installedDate,
        address: machine.address,
        gisLatitude: machine.gisLatitude,
        gisLongitude: machine.gisLongitude,
        price: machine.price,
        startTime: machine.startTime,
        endTime: machine.endTime,
        serviceRefillStart: machine.serviceRefillStart?.trim() || undefined,
        serviceRefillEnd: machine.serviceRefillEnd?.trim() || undefined,

        cups: machine.cups === "" ? undefined : Number(machine.cups),
        mlToDispense:
          machine.mlToDispense === ""
            ? undefined
            : Number(machine.mlToDispense),
        lockPass: machine.lockPass?.trim() ? machine.lockPass : undefined,
        kitchenId: machine.kitchenId?.trim() ? machine.kitchenId : undefined,
      });
      toast.success("Machine updated successfully");
      // Audit log
      await logAction({
        action: "machine_edit",
        targetId: machine.id,
        targetType: "machine",
        details: `Edited machine "${machine.name}" (${machine.id})`,
      });
      router.push(`/machines/${machineId}`);
    } catch (error) {
      console.error("Error updating machine:", error);
      toast.error("Failed to update machine. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!machine._id) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-medium">Loading machine data...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Machine: {machine.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">Machine ID</Label>
                <Input
                  id="id"
                  name="id"
                  value={machine.id}
                  onChange={handleInputChange}
                  required
                  disabled
                  placeholder="Enter machine ID"
                />
                <p className="text-xs text-muted-foreground">
                  Machine ID cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Machine Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={machine.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter machine name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={machine.model}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter model number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Cup</Label>
                <Input
                  id="price"
                  name="price"
                  value={machine.price}
                  onChange={handleInputChange}
                  placeholder="Enter price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cups">Total Cup's</Label>
                <Input
                  id="cups"
                  name="cups"
                  type="number"
                  value={machine.cups}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockPass">Lock Pass</Label>
                <Input
                  id="lockPass"
                  name="lockPass"
                  value={machine.lockPass || ""}
                  onChange={handleInputChange}
                  placeholder="Enter lock pass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kitchenId">Assigned Kitchen</Label>
                <Select
                  value={machine.kitchenId || "none"}
                  onValueChange={(value) =>
                    setMachine((prev) => ({
                      ...prev,
                      kitchenId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger id="kitchenId">
                    <SelectValue placeholder="No kitchen assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No kitchen assigned</SelectItem>
                    {kitchens.map((kitchen) => (
                      <SelectItem key={kitchen.userId} value={kitchen.userId}>
                        {kitchen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Required for low-canister refill requests to reach a kitchen.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installedDate">Installation Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !machine.installedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {machine.installedDate ? (
                        format(new Date(machine.installedDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        machine.installedDate
                          ? new Date(machine.installedDate)
                          : undefined
                      }
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={machine.description}
                onChange={handleInputChange}
                required
                placeholder="Enter machine description"
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={machine.startTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={machine.endTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceRefillStart">Service Refill Start</Label>
                <Input
                  id="serviceRefillStart"
                  name="serviceRefillStart"
                  type="time"
                  value={machine.serviceRefillStart}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Start of low-cup service window (e.g. 13:00)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceRefillEnd">Service Refill End</Label>
                <Input
                  id="serviceRefillEnd"
                  name="serviceRefillEnd"
                  type="time"
                  value={machine.serviceRefillEnd}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  End of service window — shown to customers as refill time (e.g. 17:00)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mlToDispense">ML to Dispense</Label>
                <Input
                  id="mlToDispense"
                  name="mlToDispense"
                  type="number"
                  value={machine.mlToDispense}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="gisLatitude">GIS Latitude</Label>
                <Input
                  id="gisLatitude"
                  name="gisLatitude"
                  value={machine.gisLatitude}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter latitude"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gisLongitude">GIS Longitude</Label>
                <Input
                  id="gisLongitude"
                  name="gisLongitude"
                  value={machine.gisLongitude}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter longitude"
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <h4 className="text-md font-medium">Address Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address.building">Building</Label>
                  <Input
                    id="address.building"
                    name="address.building"
                    value={machine.address.building}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter building"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address.floor">Floor</Label>
                  <Input
                    id="address.floor"
                    name="address.floor"
                    value={machine.address.floor}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter floor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address.area">Area</Label>
                  <Input
                    id="address.area"
                    name="address.area"
                    value={machine.address.area}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter area"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address.district">District</Label>
                  <Input
                    id="address.district"
                    name="address.district"
                    value={machine.address.district}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter district"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address.state">State</Label>
                  <Input
                    id="address.state"
                    name="address.state"
                    value={machine.address.state}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter state"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
