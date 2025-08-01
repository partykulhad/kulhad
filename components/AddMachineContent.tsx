"use client";
import type React from "react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  PlusIcon,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Address {
  building: string;
  floor: string;
  area: string;
  district: string;
  state: string;
}

interface Machine {
  _id?: Id<"machines">;
  id: string;
  name: string;
  description: string;
  installedDate?: string;
  model: string;
  address: Address;
  gisLatitude: string;
  gisLongitude: string;
  price?: string;
  startTime?: string;
  endTime?: string;
  teaFillStartQuantity?: number;
  teaFillEndQuantity?: number;
  flushTimeMinutes?: number;
  mlToDispense?: number;
  status?: string;
  temperature?: number;
  rating?: number;
  canisterLevel?: number;
  replenishmentOrder?: { status: string; eta: string | null };
  deliveryBoy?: any | null;
  lastFulfilled?: string;
  managerName?: string;
  contactNo?: string;
  email?: string;
  machineType?: string;
  breakTime?: string;
  breakStart?: string;
  breakEnd?: string;
  workingDays?: string; // New field for working days
}

// Working days options with display labels and code values
const WORKING_DAYS_OPTIONS = [
  { label: "Monday - Friday", value: "MON_FRI" },
  { label: "Monday - Saturday", value: "MON_SAT" },
  { label: "All 7 Days", value: "ALL_DAYS" },
];

// Helper function to get display label from code
const getWorkingDaysLabel = (code: string) => {
  const option = WORKING_DAYS_OPTIONS.find((opt) => opt.value === code);
  return option ? option.label : code;
};

export default function AddMachineContent() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [machine, setMachine] = useState<Machine>({
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
    teaFillStartQuantity: 0,
    teaFillEndQuantity: 0,
    flushTimeMinutes: 0,
    mlToDispense: 0,
    installedDate: undefined,
    managerName: "",
    contactNo: "",
    email: "",
    machineType: "Full Time",
    breakStart: "",
    breakEnd: "",
    workingDays: "MON_FRI", // Default to Monday-Friday
  });

  const machines = useQuery(api.machines.list) || [];
  const addMachine = useMutation(api.machines.add);
  const editMachine = useMutation(api.machines.update);
  const deleteMachine = useMutation(api.machines.remove);
  const toggleStatus = useMutation(api.machines.toggleStatus);

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
          name === "flushTimeMinutes" ||
          name === "mlToDispense" ||
          name === "teaFillStartQuantity" ||
          name === "teaFillEndQuantity"
            ? value === ""
              ? undefined
              : Number.parseInt(value, 10)
            : value,
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setMachine((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    try {
      if (isEditing && machine._id) {
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
          teaFillStartQuantity: machine.teaFillStartQuantity,
          teaFillEndQuantity: machine.teaFillEndQuantity,
          flushTimeMinutes: machine.flushTimeMinutes,
          mlToDispense: machine.mlToDispense,
          managerName: machine.managerName,
          contactNo: machine.contactNo,
          email: machine.email,
          machineType: machine.machineType,
          breakTime: machine.breakTime,
          breakStart: machine.breakStart,
          breakEnd: machine.breakEnd,
          workingDays: machine.workingDays, // Include working days
        });
        toast.success("Machine updated successfully");
      } else {
        const result = await addMachine({
          id: machine.id,
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
          teaFillStartQuantity: machine.teaFillStartQuantity,
          teaFillEndQuantity: machine.teaFillEndQuantity,
          flushTimeMinutes: machine.flushTimeMinutes,
          mlToDispense: machine.mlToDispense,
          managerName: machine.managerName,
          contactNo: machine.contactNo,
          email: machine.email,
          machineType: machine.machineType,
          breakTime: machine.breakTime,
          breakStart: machine.breakStart,
          breakEnd: machine.breakEnd,
          workingDays: machine.workingDays, // Include working days
        });
        toast.success(`Machine added successfully with ID: ${result.id}`);
      }

      // Reset form
      setMachine({
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
        teaFillStartQuantity: 0,
        teaFillEndQuantity: 0,
        flushTimeMinutes: 0,
        mlToDispense: 0,
        installedDate: undefined,
        managerName: "",
        contactNo: "",
        email: "",
        machineType: "Full Time",
        breakTime: "",
        workingDays: "MON_FRI", // Reset to default
      });
      setIsDialogOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error adding/editing machine:", error);
      toast.error("Failed to add/edit machine. Please try again.");
    }
  };

  const handleEdit = (editMachine: Machine) => {
    setMachine({
      ...editMachine,
      id: editMachine.id || "",
      name: editMachine.name || "",
      description: editMachine.description || "",
      model: editMachine.model || "",
      address: editMachine.address || {
        building: "",
        floor: "",
        area: "",
        district: "",
        state: "",
      },
      gisLatitude: editMachine.gisLatitude || "",
      gisLongitude: editMachine.gisLongitude || "",
      teaFillStartQuantity: editMachine.teaFillStartQuantity ?? 0,
      teaFillEndQuantity: editMachine.teaFillEndQuantity ?? 0,
      managerName: editMachine.managerName || "",
      contactNo: editMachine.contactNo || "",
      email: editMachine.email || "",
      machineType: editMachine.machineType || "Full Time",
      breakTime: editMachine.breakTime || "",
      workingDays: editMachine.workingDays || "MON_FRI", // Include working days with default
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: Id<"machines">) => {
    if (window.confirm("Are you sure you want to delete this machine?")) {
      try {
        await deleteMachine({ id });
        toast.success("Machine deleted successfully");
      } catch (error) {
        console.error("Error deleting machine:", error);
        toast.error("Failed to delete machine. Please try again.");
      }
    }
  };

  const handleToggleStatus = async (id: Id<"machines">) => {
    try {
      await toggleStatus({ id });
      toast.success("Machine status updated successfully");
    } catch (error) {
      console.error("Error updating machine status:", error);
      toast.error("Failed to update machine status. Please try again.");
    }
  };

  const navigateToMachineDetails = (machineId: string) => {
    router.push(`/machines/${machineId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vending Machines</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setIsEditing(false);
              setMachine({
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
                teaFillStartQuantity: 0,
                teaFillEndQuantity: 0,
                flushTimeMinutes: 0,
                mlToDispense: 0,
                installedDate: undefined,
                managerName: "",
                contactNo: "",
                email: "",
                machineType: "Full Time",
                breakTime: "",
                workingDays: "MON_FRI",
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add New Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Machine" : "Add New Machine"}
              </DialogTitle>
              <DialogDescription>
                Enter the details of the vending machine here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Machine Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id">Machine ID</Label>
                    <Input
                      id="id"
                      name="id"
                      value={machine.id}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter machine ID"
                    />
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
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                    >
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
                  {/* Working Days Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="workingDays">Working Days</Label>
                    <Select
                      value={machine.workingDays}
                      onValueChange={(value) =>
                        handleSelectChange("workingDays", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select working days" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKING_DAYS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              </div>

              {/* Operating Hours Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Operating Hours
                </h3>
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
                    <Label htmlFor="teaFillStartQuantity">
                      Initial Tea Fill Quantity (ml)
                    </Label>
                    <Input
                      id="teaFillStartQuantity"
                      name="teaFillStartQuantity"
                      type="number"
                      value={machine.teaFillStartQuantity}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Initial quantity of tea to fill"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teaFillEndQuantity">
                      Final Tea Fill Quantity (ml)
                    </Label>
                    <Input
                      id="teaFillEndQuantity"
                      name="teaFillEndQuantity"
                      type="number"
                      value={machine.teaFillEndQuantity}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="Final quantity of tea to fill"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Settings Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Technical Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flushTimeMinutes">
                      Flush Time (minutes)(optional)
                    </Label>
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
              </div>

              {/* Manager Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Manager Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerName">Manager Name</Label>
                    <Input
                      id="managerName"
                      name="managerName"
                      value={machine.managerName}
                      onChange={handleInputChange}
                      placeholder="Enter manager name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNo">Contact Number</Label>
                    <Input
                      id="contactNo"
                      name="contactNo"
                      value={machine.contactNo}
                      onChange={handleInputChange}
                      placeholder="Enter contact number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={machine.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machineType">Machine Type</Label>
                    <Select
                      value={machine.machineType}
                      onValueChange={(value) =>
                        handleSelectChange("machineType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select machine type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full Time">Full Time</SelectItem>
                        <SelectItem value="Peek Time">Peek Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {machine.machineType === "Peek Time" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Break Time</Label>
                      <div className="flex gap-4">
                        <div className="flex flex-col space-y-1">
                          <Label htmlFor="breakStart">From</Label>
                          <input
                            type="time"
                            id="breakStart"
                            name="breakStart"
                            value={machine.breakStart || ""}
                            onChange={handleInputChange}
                            className="h-10 px-3 rounded-md border border-input text-sm"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Label htmlFor="breakEnd">To</Label>
                          <input
                            type="time"
                            id="breakEnd"
                            name="breakEnd"
                            value={machine.breakEnd || ""}
                            onChange={handleInputChange}
                            className="h-10 px-3 rounded-md border border-input text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <DialogFooter>
                <Button type="submit">
                  {isEditing ? "Update" : "Add"} Machine
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Working Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operating Hours</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow
                key={machine._id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigateToMachineDetails(machine.id)}
              >
                <TableCell>{machine.id}</TableCell>
                <TableCell>{machine.name}</TableCell>
                <TableCell>{machine.model}</TableCell>
                <TableCell>
                  {machine.address.building}, {machine.address.area}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getWorkingDaysLabel(machine.workingDays || "MON_FRI")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      machine.status === "online" ? "success" : "secondary"
                    }
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(machine._id);
                    }}
                  >
                    {machine.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {machine.startTime || "00:00"} - {machine.endTime || "24:00"}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(machine);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(machine._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToMachineDetails(machine.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
