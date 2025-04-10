"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Thermometer,
  Droplet,
  Star,
  Calendar,
  Settings,
  Truck,
  History,
  AlertTriangle,
} from "lucide-react";

export default function MachineDetailsPage() {
  const router = useRouter();
  const { machineId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Get all machines and find the one that matches the ID
  const machines = useQuery(api.machines.list) || [];
  const machine = machines.find((m) => m.id === machineId);

  // Get machine data history
  const machineData =
    useQuery(
      api.machines.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  // Get replenishment requests for this machine
  const requests =
    useQuery(
      api.requests.getByMachineId,
      machine ? { machineId: machine.id } : { machineId: "" }
    ) || [];

  if (!machine) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Machine Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The machine with ID {machineId} could not be found.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{machine.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                variant={machine.status === "online" ? "success" : "secondary"}
                className="mr-2"
              >
                {machine.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {machine.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/machines/${machineId}/edit`)}
          >
            Edit Machine
          </Button>
          <Button>Request Refill</Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full mr-2 ${machine.status === "online" ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                  <span className="text-2xl font-bold">
                    {machine.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date().toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Thermometer className="h-5 w-5 mr-2 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {machine.temperature}°C
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Optimal range: 2°C - 8°C
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Canister Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {machine.canisterLevel}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {machine.canisterLevel < 20
                        ? "Low"
                        : machine.canisterLevel < 50
                          ? "Medium"
                          : "Good"}
                    </span>
                  </div>
                  <Progress value={machine.canisterLevel} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {machine.canisterLevel < 20
                    ? "Refill needed soon"
                    : machine.canisterLevel < 50
                      ? "Monitor levels"
                      : "Level is good"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Operating Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  <span className="text-xl font-bold">
                    {machine.startTime || "00:00"} -{" "}
                    {machine.endTime || "24:00"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {machine.startTime && machine.endTime
                    ? `${Number.parseInt(machine.endTime) - Number.parseInt(machine.startTime)} hours per day`
                    : "24 hours operation"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl font-bold">
                    {machine.rating || 0}/5
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on customer feedback
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Last Refilled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                  <span className="text-xl font-bold">
                    {machine.lastFulfilled
                      ? new Date(machine.lastFulfilled).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {machine.lastFulfilled
                    ? `${Math.floor((new Date().getTime() - new Date(machine.lastFulfilled).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                    : "No record found"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Machine Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{machine.description}</p>
            </CardContent>
          </Card>

          {machine.replenishmentOrder && (
            <Card
              className={
                machine.replenishmentOrder.status === "pending"
                  ? "border-yellow-500"
                  : "border-green-500"
              }
            >
              <CardHeader className="pb-2">
                <CardTitle>Replenishment Status</CardTitle>
                <CardDescription>
                  Current replenishment order status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <Badge
                    variant={
                      machine.replenishmentOrder.status === "pending"
                        ? "outline"
                        : "default"
                    }
                    className="mr-2"
                  >
                    {machine.replenishmentOrder.status}
                  </Badge>
                  {machine.replenishmentOrder.eta && (
                    <span className="text-sm">
                      ETA:{" "}
                      {new Date(
                        machine.replenishmentOrder.eta
                      ).toLocaleString()}
                    </span>
                  )}
                </div>

                {machine.deliveryBoy && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <h4 className="font-medium mb-2">Delivery Agent</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Name:</div>
                      <div>{machine.deliveryBoy.name}</div>
                      <div>Location:</div>
                      <div>{machine.deliveryBoy.location}</div>
                      <div>ETA:</div>
                      <div>
                        {machine.deliveryBoy.eta
                          ? new Date(
                              machine.deliveryBoy.eta
                            ).toLocaleTimeString()
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Track Delivery
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Machine Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Machine ID
                    </h3>
                    <p className="text-lg">{machine.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Model
                    </h3>
                    <p className="text-lg">{machine.model}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Installation Date
                    </h3>
                    <p className="text-lg">
                      {machine.installedDate
                        ? new Date(machine.installedDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Price per Cup
                    </h3>
                    <p className="text-lg">{machine.price || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      ML to Dispense
                    </h3>
                    <p className="text-lg">{machine.mlToDispense || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Flush Time
                    </h3>
                    <p className="text-lg">
                      {machine.flushTimeMinutes
                        ? `${machine.flushTimeMinutes} minutes`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Technical Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Operating Hours</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.startTime || "00:00"} -{" "}
                        {machine.endTime || "24:00"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Droplet className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dispense Amount</p>
                      <p className="text-sm text-muted-foreground">
                        {machine.mlToDispense || 0} ml
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Address
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="font-medium">{machine.address.building}</p>
                    <p>Floor: {machine.address.floor}</p>
                    <p>{machine.address.area}</p>
                    <p>
                      {machine.address.district}, {machine.address.state}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    GPS Coordinates
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-500" />
                    <div>
                      <p>Latitude: {machine.gisLatitude}</p>
                      <p>Longitude: {machine.gisLongitude}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Map
                </h3>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Map view would be displayed here
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Machine Data History</CardTitle>
              <CardDescription>
                Recent readings from the machine
              </CardDescription>
            </CardHeader>
            <CardContent>
              {machineData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Timestamp</th>
                        <th className="text-left py-3 px-4">Temperature</th>
                        <th className="text-left py-3 px-4">Canister Level</th>
                        <th className="text-left py-3 px-4">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineData.map((data, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">
                            {new Date(data.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {data.temperature !== undefined
                              ? `${data.temperature}°C`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {data.canisterLevel !== undefined
                              ? `${data.canisterLevel}%`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {data.rating !== undefined
                              ? `${data.rating}/5`
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No History Available
                  </h3>
                  <p className="text-muted-foreground">
                    No data has been recorded for this machine yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replenishment History</CardTitle>
              <CardDescription>Past replenishment requests</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Request ID</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Delivery Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.requestId} className="border-b">
                          <td className="py-3 px-4">{request.requestId}</td>
                          <td className="py-3 px-4">
                            {new Date(
                              request.requestDateTime
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                request.requestStatus === "completed"
                                  ? "success"
                                  : request.requestStatus === "pending"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {request.requestStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {request.assignRefillerName || "Not assigned"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Replenishment History
                  </h3>
                  <p className="text-muted-foreground">
                    No replenishment requests have been made for this machine.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
              <CardDescription>
                Upcoming and past maintenance activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No Maintenance Records
                </h3>
                <p className="text-muted-foreground">
                  No maintenance records are available for this machine.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Schedule Maintenance</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Machine performance and SLO data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {machine.slo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Uptime</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.uptime}%
                      </span>
                    </div>
                    <Progress value={machine.slo.uptime} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Response Time</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.responseTime}ms
                      </span>
                    </div>
                    <Progress
                      value={100 - machine.slo.responseTime / 10}
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Availability Target</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold">
                        {machine.slo.availabilityTarget}%
                      </span>
                    </div>
                    <Progress
                      value={machine.slo.availabilityTarget}
                      className="h-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Performance Data
                  </h3>
                  <p className="text-muted-foreground">
                    Performance metrics are not available for this machine.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
