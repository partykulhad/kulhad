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
  flushTimeMinutes?: number;
  mlToDispense?: number;
  installedDate?: string;
  status?: string;
  temperature?: number;
  rating?: number;
  canisterLevel?: number;
  replenishmentOrder?: { status: string; eta: string | null };
  deliveryBoy?: any | null;
  lastFulfilled?: string;
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
    startTime: "",
    endTime: "",
    flushTimeMinutes: 0,
    mlToDispense: 0,
  });

  const machines = useQuery(api.machines.list) || [];
  const editMachine = useMutation(api.machines.update);

  useEffect(() => {
    const foundMachine = machines.find((m) => m.id === machineId);
    if (foundMachine) {
      setMachine({
        ...foundMachine,
        price: foundMachine.price || "",
        startTime: foundMachine.startTime || "",
        endTime: foundMachine.endTime || "",
        flushTimeMinutes: foundMachine.flushTimeMinutes || 0,
        mlToDispense: foundMachine.mlToDispense || 0,
      });
    }
  }, [machines, machineId]);

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
          name === "flushTimeMinutes" || name === "mlToDispense"
            ? value === ""
              ? undefined
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
        flushTimeMinutes: machine.flushTimeMinutes,
        mlToDispense: machine.mlToDispense,
      });
      toast.success("Machine updated successfully");
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
                <Label htmlFor="flushTimeMinutes">Flush Time (minutes)</Label>
                <Input
                  id="flushTimeMinutes"
                  name="flushTimeMinutes"
                  type="number"
                  value={machine.flushTimeMinutes}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
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
