import React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CoffeeIcon,
  ThermometerIcon,
  DropletIcon,
  AlertCircleIcon,
  CalendarIcon,
  TruckIcon,
  Star,
  DollarSignIcon,
} from "lucide-react";

interface Transaction {
  id: string;
  time: string;
  product: string;
  category: string;
  amount: number;
}

interface DashboardContentProps {
  selectedMachine: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  vendingMachines: any[];
}

export default function DashboardContent({
  selectedMachine,
  selectedDate,
  setSelectedDate,
  vendingMachines,
}: DashboardContentProps) {
  const toggleMachineStatus = useMutation(api.machines.toggleStatus);

  const selectedMachineData =
    selectedMachine === "all"
      ? null
      : vendingMachines.find((vm) => vm._id === selectedMachine);

  const transactions: Transaction[] = [
    {
      id: "1",
      time: "09:00 AM",
      product: "Green Tea",
      category: "Green",
      amount: 2.5,
    },
    {
      id: "2",
      time: "10:30 AM",
      product: "Black Tea",
      category: "Black",
      amount: 2.0,
    },
    {
      id: "3",
      time: "11:45 AM",
      product: "Oolong Tea",
      category: "Oolong",
      amount: 3.0,
    },
    {
      id: "4",
      time: "01:15 PM",
      product: "Earl Grey",
      category: "Black",
      amount: 2.5,
    },
    {
      id: "5",
      time: "02:30 PM",
      product: "Jasmine Tea",
      category: "Green",
      amount: 2.75,
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Machines
            </CardTitle>
            <CoffeeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendingMachines.length}</div>
            <p className="text-xs text-muted-foreground">
              {vendingMachines.filter((vm) => vm.status === "online").length}{" "}
              online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DropletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245 cups</div>
            <p className="text-xs text-muted-foreground">+15% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
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
                          machine.status === "online" ? "default" : "secondary"
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
                            : machine.replenishmentOrder.status === "Placed"
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
            <CardDescription>Detailed metrics and controls</CardDescription>
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
                <h3 className="text-lg font-semibold mb-2">Temperature</h3>
                <div className="flex items-center space-x-2">
                  <ThermometerIcon className="h-5 w-5 text-red-500" />
                  <span>{selectedMachineData.temperature}°C</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-2">Canister Levels</h3>
                <div className="space-y-2">
                  {Object.entries(selectedMachineData.canisterLevel).map(
                    ([tea, level]) => (
                      <div key={tea} className="flex items-center space-x-2">
                        <span className="w-20 capitalize">{tea} Tea:</span>
                        <Progress
                          value={typeof level === "number" ? level : 0}
                          className="flex-1"
                        />
                        <span>
                          {typeof level === "number" ? `${level}%` : "N/A"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Replenishment Order
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      selectedMachineData.replenishmentOrder.status === "Urgent"
                        ? "destructive"
                        : selectedMachineData.replenishmentOrder.status ===
                            "Placed"
                          ? "default"
                          : selectedMachineData.replenishmentOrder.status ===
                              "Delivered"
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
                <h3 className="text-lg font-semibold mb-2">Delivery Status</h3>
                {selectedMachineData.deliveryBoy ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <TruckIcon className="h-5 w-5" />
                      <span>{selectedMachineData.deliveryBoy.name}</span>
                    </div>
                    <div>
                      Location: {selectedMachineData.deliveryBoy.location}
                    </div>
                    {selectedMachineData.deliveryBoy.eta && (
                      <div>ETA: {selectedMachineData.deliveryBoy.eta}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    No delivery scheduled
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Last Fulfilled</h3>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{selectedMachineData.lastFulfilled}</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Latest IoT Data</h3>
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
                    <p className="text-2xl font-bold">{latestIoTData.rating}</p>
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
              <h3 className="text-lg font-semibold mb-2">Transactions</h3>
              <div className="flex items-center space-x-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={new Date().toISOString().split("T")[0]}>
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
                    {Object.entries(categorySales).map(([category, amount]) => (
                      <div key={category}>
                        <p className="text-sm font-medium text-muted-foreground capitalize">
                          {category} Tea Sales
                        </p>
                        <p className="text-2xl font-bold">
                          ${amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
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
                      <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
