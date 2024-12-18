"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Address {
  building: string;
  floor: string;
  area: string;
  district: string;
  state: string;
}

interface NewMachine {
  id: string;
  name: string;
  description: string;
  installedDate: Date | undefined;
  model: string;
  address: Address;
  gisLatitude: string;
  gisLongitude: string;
}

export default function AddMachineContent() {
  const [newMachine, setNewMachine] = useState<NewMachine>({
    id: "",
    name: "",
    description: "",
    installedDate: undefined,
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
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const addMachine = useMutation(api.machines.add);

  const handleMachineInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setNewMachine((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setNewMachine((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setNewMachine((prev) => ({ ...prev, installedDate: date }));
    setIsCalendarOpen(false);
  };

  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const machineData = {
        ...newMachine,
        installedDate: newMachine.installedDate?.toISOString(),
      };
      const result = await addMachine(machineData);
      console.log("New machine added:", result);
      toast.success(
        `${newMachine.name} has been successfully added with ID: ${result.id}`
      );
      setNewMachine({
        id: "",
        name: "",
        description: "",
        installedDate: undefined,
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
      });
    } catch (error) {
      console.error("Error adding machine:", error);
      toast.error("Failed to add machine. Please try again.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Vending Machine</CardTitle>
          <CardDescription>
            Enter the details for the new vending machine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMachineSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  name="id"
                  value={newMachine.id}
                  onChange={handleMachineInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newMachine.name}
                  onChange={handleMachineInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={newMachine.model}
                  onChange={handleMachineInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="installedDate">Installation Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newMachine.installedDate && "text-muted-foreground"
                      )}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newMachine.installedDate ? (
                        format(newMachine.installedDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newMachine.installedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="gisLatitude">GIS Latitude</Label>
                <Input
                  id="gisLatitude"
                  name="gisLatitude"
                  value={newMachine.gisLatitude}
                  onChange={handleMachineInputChange}
                  placeholder="Latitude"
                  required
                />
              </div>
              <div>
                <Label htmlFor="gisLongitude">GIS Longitude</Label>
                <Input
                  id="gisLongitude"
                  name="gisLongitude"
                  value={newMachine.gisLongitude}
                  onChange={handleMachineInputChange}
                  placeholder="Longitude"
                  required
                />
              </div>
              <div className="col-span-full">
                <Label>Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Input
                    name="address.building"
                    value={newMachine.address.building}
                    onChange={handleMachineInputChange}
                    placeholder="Building"
                  />
                  <Input
                    name="address.floor"
                    value={newMachine.address.floor}
                    onChange={handleMachineInputChange}
                    placeholder="Floor"
                  />
                  <Input
                    name="address.area"
                    value={newMachine.address.area}
                    onChange={handleMachineInputChange}
                    placeholder="Area"
                  />
                  <Input
                    name="address.district"
                    value={newMachine.address.district}
                    onChange={handleMachineInputChange}
                    placeholder="District"
                  />
                  <Input
                    name="address.state"
                    value={newMachine.address.state}
                    onChange={handleMachineInputChange}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="col-span-full">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newMachine.description}
                  onChange={handleMachineInputChange}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                Add Machine
              </Button>
            </DialogFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
