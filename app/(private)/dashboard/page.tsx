"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "@/components/AuthenticatedHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CoffeeIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ThermometerIcon,
  DropletIcon,
  AlertCircleIcon,
  CalendarIcon,
  TruckIcon,
  DollarSignIcon,
  PhoneIcon,
  MailIcon,
  PlusCircleIcon,
  UserPlusIcon,
  UsersIcon,
  Star,
} from "lucide-react";

interface VendingMachine {
  _id: string;
  id: string;
  name: string;
  status: "online" | "offline";
  temperature: number;
  canisterLevels: { [key: string]: number };
  replenishmentOrder: { status: string; eta: string | null };
  deliveryBoy: { name: string; location: string; eta: string | null } | null;
  lastFulfilled: string;
}

interface Vendor {
  _id: string;
  id: string;
  name: string;
  status: string;
  amountDue: number;
  lastOrder: string;
  contactPerson: string;
  email: string;
  phone: string;
}

interface Transaction {
  id: string;
  time: string;
  product: string;
  category: string;
  amount: number;
}

export default function TeaVendingDashboard() {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [newMachine, setNewMachine] = useState({
    id: "",
    name: "",
    location: "",
    description: "",
  });
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const vendingMachines = useQuery(api.machines.list) || [];
  const vendors = useQuery(api.vendors.list) || [];

  const selectedMachineData =
    selectedMachine === "all"
      ? null
      : vendingMachines.find((vm) => vm._id === selectedMachine);

  const toggleMachineStatus = useMutation(api.machines.toggleStatus);

  const transactions: Transaction[] = [
    {
      id: "T001",
      time: "09:15 AM",
      product: "Green Tea",
      category: "green",
      amount: 3.5,
    },
    {
      id: "T002",
      time: "10:30 AM",
      product: "Black Tea",
      category: "black",
      amount: 3.0,
    },
    {
      id: "T003",
      time: "11:45 AM",
      product: "Oolong Tea",
      category: "oolong",
      amount: 4.0,
    },
  ];

  const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
  const categorySales = transactions.reduce(
    (acc: { [key: string]: number }, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    },
    {}
  );

  const handleMachineInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewMachine((prev) => ({ ...prev, [name]: value }));
  };

  const handleVendorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const addMachine = useMutation(api.machines.add);
  const handleMachineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addMachine(newMachine);
      console.log("New machine added:", result);
      toast.success(
        `${newMachine.name} has been successfully added with ID: ${result.id}`
      );
      setNewMachine({ id: "", name: "", location: "", description: "" });
      setIsAddMachineOpen(false);
    } catch (error) {
      console.error("Error adding machine:", error);
      toast.error("Failed to add machine. Please try again.");
    }
  };

  const addVendor = useMutation(api.vendors.add);
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addVendor(newVendor);
      console.log("New vendor added:", result);
      toast.success(
        `${newVendor.name} from ${newVendor.company} has been successfully added.`
      );
      setNewVendor({ name: "", email: "", phone: "", company: "" });
      setIsAddVendorOpen(false);
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor. Please try again.");
    }
  };

  const latestIoTData = useQuery(
    api.iot.getLatestIoTData,
    selectedMachineData ? { machineId: selectedMachineData.id } : "skip"
  );

  const renderStars = (rating: number | undefined) => {
    const roundedRating = Math.round(rating ?? 0);
    return Array(roundedRating)
      .fill(0)
      .map((_, index) => (
        <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ));
  };

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Machines
                    </CardTitle>
                    <CoffeeIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {vendingMachines.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {
                        vendingMachines.filter((vm) => vm.status === "online")
                          .length
                      }{" "}
                      online
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Sales Today
                    </CardTitle>
                    <DropletIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,245 cups</div>
                    <p className="text-xs text-muted-foreground">
                      +15% from yesterday
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Alerts
                    </CardTitle>
                    <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">
                      2 low inventory, 1 maintenance
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selectedMachine === "all" && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Vending Machines</CardTitle>
                    <CardDescription>
                      Overview of all tea vending machines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Replenishment</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>Last Fulfilled</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendingMachines.map((machine) => (
                          <TableRow key={machine._id}>
                            <TableCell>{machine.id}</TableCell>
                            <TableCell>{machine.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  machine.status === "online"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {machine.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  machine.replenishmentOrder.status === "Urgent"
                                    ? "destructive"
                                    : machine.replenishmentOrder.status ===
                                        "Placed"
                                      ? "default"
                                      : machine.replenishmentOrder.status ===
                                          "Delivered"
                                        ? "default"
                                        : "secondary"
                                }
                              >
                                {machine.replenishmentOrder.status}
                              </Badge>
                              {machine.replenishmentOrder.eta && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ETA: {machine.replenishmentOrder.eta}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {machine.deliveryBoy ? (
                                <div className="flex items-center">
                                  <TruckIcon className="h-4 w-4 mr-2" />
                                  <span>
                                    {machine.deliveryBoy.name} -{" "}
                                    {machine.deliveryBoy.location}
                                  </span>
                                  {machine.deliveryBoy.eta && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ETA: {machine.deliveryBoy.eta}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  No delivery scheduled
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{machine.lastFulfilled}</TableCell>
                            <TableCell>
                              <Switch
                                checked={machine.status === "online"}
                                onCheckedChange={() =>
                                  toggleMachineStatus({ id: machine._id })
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedMachineData && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>
                      {selectedMachineData.name} ({selectedMachineData.id})
                    </CardTitle>
                    <CardDescription>
                      Detailed metrics and controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Status</h3>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedMachineData.status === "online"}
                            onCheckedChange={() =>
                              toggleMachineStatus({
                                id: selectedMachineData._id,
                              })
                            }
                          />
                          <span>
                            {selectedMachineData.status === "online"
                              ? "Online"
                              : "Offline"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Temperature
                        </h3>
                        <div className="flex items-center space-x-2">
                          <ThermometerIcon className="h-5 w-5 text-red-500" />
                          <span>{selectedMachineData.temperature}°C</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold mb-2">
                          Canister Levels
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(
                            selectedMachineData.canisterLevel
                          ).map(([tea, level]) => (
                            <div
                              key={tea}
                              className="flex items-center space-x-2"
                            >
                              <span className="w-20 capitalize">
                                {tea} Tea:
                              </span>
                              <Progress value={level} className="flex-1" />
                              <span>{level}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Replenishment Order
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              selectedMachineData.replenishmentOrder.status ===
                              "Urgent"
                                ? "destructive"
                                : selectedMachineData.replenishmentOrder
                                      .status === "Placed"
                                  ? "default"
                                  : selectedMachineData.replenishmentOrder
                                        .status === "Delivered"
                                    ? "default"
                                    : "secondary"
                            }
                          >
                            {selectedMachineData.replenishmentOrder.status}
                          </Badge>
                          {selectedMachineData.replenishmentOrder.eta && (
                            <span className="text-sm text-muted-foreground">
                              ETA: {selectedMachineData.replenishmentOrder.eta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Delivery Status
                        </h3>
                        {selectedMachineData.deliveryBoy ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <TruckIcon className="h-5 w-5" />
                              <span>
                                {selectedMachineData.deliveryBoy.name}
                              </span>
                            </div>
                            <div>
                              Location:{" "}
                              {selectedMachineData.deliveryBoy.location}
                            </div>
                            {selectedMachineData.deliveryBoy.eta && (
                              <div>
                                ETA: {selectedMachineData.deliveryBoy.eta}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No delivery scheduled
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          Last Fulfilled
                        </h3>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-5 w-5" />
                          <span>{selectedMachineData.lastFulfilled}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Latest IoT Data
                      </h3>
                      {latestIoTData ? (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Temperature
                            </p>
                            <p className="text-2xl font-bold">
                              {latestIoTData.temperature}°C
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Canister Level
                            </p>
                            <p className="text-2xl font-bold">
                              {latestIoTData.canisterLevel}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Rating
                            </p>
                            <p className="text-2xl font-bold">
                              {latestIoTData.rating}
                            </p>
                            <div className="flex mt-1">
                              {renderStars(latestIoTData.rating)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p>No IoT data available for this machine.</p>
                      )}
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">
                        Transactions
                      </h3>
                      <div className="flex items-center space-x-2 mb-4">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <Select
                          value={selectedDate}
                          onValueChange={setSelectedDate}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a date" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={new Date().toISOString().split("T")[0]}
                            >
                              Today
                            </SelectItem>
                            <SelectItem
                              value={
                                new Date(Date.now() - 86400000)
                                  .toISOString()
                                  .split("T")[0]
                              }
                            >
                              Yesterday
                            </SelectItem>
                            <SelectItem
                              value={
                                new Date(Date.now() - 172800000)
                                  .toISOString()
                                  .split("T")[0]
                              }
                            >
                              2 days ago
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Card className="mb-4">
                        <CardHeader>
                          <CardTitle>Sales Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Total Sales
                              </p>
                              <p className="text-2xl font-bold">
                                ${totalSales.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Transactions
                              </p>
                              <p className="text-2xl font-bold">
                                {transactions.length}
                              </p>
                            </div>
                            {Object.entries(categorySales).map(
                              ([category, amount]) => (
                                <div key={category}>
                                  <p className="text-sm font-medium text-muted-foreground capitalize">
                                    {category} Tea Sales
                                  </p>
                                  <p className="text-2xl font-bold">
                                    ${amount.toFixed(2)}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.id}</TableCell>
                              <TableCell>{transaction.time}</TableCell>
                              <TableCell>{transaction.product}</TableCell>
                              <TableCell>
                                ${transaction.amount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="vendors">
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Overview</CardTitle>
                  <CardDescription>
                    List of all onboarded vendors and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount Due</TableHead>
                        <TableHead>Last Order</TableHead>
                        <TableHead>Contact</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map((vendor) => (
                        <TableRow key={vendor._id}>
                          <TableCell>{vendor.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage
                                  src={`/placeholder.svg?text=${vendor.name.charAt(0)}`}
                                  alt={vendor.name}
                                />
                                <AvatarFallback>
                                  {vendor.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {vendor.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                vendor.status === "Active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {vendor.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSignIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                              ${vendor.amountDue.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>{vendor.lastOrder}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {vendor.contactPerson}
                              </span>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MailIcon className="h-3 w-3 mr-1" />
                                {vendor.email}
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                {vendor.phone}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="addMachine">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Vending Machine</CardTitle>
                  <CardDescription>
                    Enter the details for the new vending machine.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMachineSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="id" className="text-right">
                          ID
                        </Label>
                        <Input
                          id="id"
                          name="id"
                          value={newMachine.id}
                          onChange={handleMachineInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={newMachine.name}
                          onChange={handleMachineInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="location" className="text-right">
                          Location
                        </Label>
                        <Input
                          id="location"
                          name="location"
                          value={newMachine.location}
                          onChange={handleMachineInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={newMachine.description}
                          onChange={handleMachineInputChange}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Machine</Button>
                    </DialogFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="addVendor">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Vendor</CardTitle>
                  <CardDescription>
                    Enter the details for the new vendor.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVendorSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vendorName" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="vendorName"
                          name="name"
                          value={newVendor.name}
                          onChange={handleVendorInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vendorEmail" className="text-right">
                          Email
                        </Label>
                        <Input
                          id="vendorEmail"
                          name="email"
                          type="email"
                          value={newVendor.email}
                          onChange={handleVendorInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vendorPhone" className="text-right">
                          Phone
                        </Label>
                        <Input
                          id="vendorPhone"
                          name="phone"
                          type="tel"
                          value={newVendor.phone}
                          onChange={handleVendorInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vendorCompany" className="text-right">
                          Company
                        </Label>
                        <Input
                          id="vendorCompany"
                          name="company"
                          value={newVendor.company}
                          onChange={handleVendorInputChange}
                          className="col-span-3"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Vendor</Button>
                    </DialogFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
