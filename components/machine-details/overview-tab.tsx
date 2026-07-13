"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CupSoda,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock3,
  Thermometer,
  BarChart3,
  Droplet,
  PlayIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { deriveCanisterLevel, isMachineUnreachable, useNow } from "@/lib/utils";

interface OverviewTabProps {
  machine: any;
  transactionMetrics: any;
}

export function OverviewTab({ machine, transactionMetrics }: OverviewTabProps) {
  const now = useNow();
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

  const lastRefillTime = useMemo(() => {
    if (!machine || !machine.lastFulfilled) return null;

    try {
      console.log("[v0] Raw machine.lastFulfilled:", machine.lastFulfilled);

      const dateTimeStr = machine.lastFulfilled.trim();
      let lastRefillDate;

      // Check if it's an ISO string (contains 'T') or old DD/MM/YYYY format
      if (dateTimeStr.includes('T') || dateTimeStr.includes('-')) {
        lastRefillDate = new Date(dateTimeStr);
      } else {
        const parts = dateTimeStr.split(" ");
        if (parts.length >= 2) {
          const [datePart, timePart, ampm] = parts;
          const [day, month, year] = datePart.split("/").map((num: string) => Number.parseInt(num, 10));
          const [hours, minutes, seconds] = timePart.split(":").map((num: string) => Number.parseInt(num, 10));
          let hour24 = hours;
          if (ampm === "PM" && hours !== 12) hour24 = hours + 12;
          else if (ampm === "AM" && hours === 12) hour24 = 0;
          lastRefillDate = new Date(year, month - 1, day, hour24, minutes, seconds);
        } else {
          lastRefillDate = new Date(dateTimeStr);
        }
      }

      if (isNaN(lastRefillDate.getTime())) {
        console.log("[v0] Date parsing failed - invalid date:", dateTimeStr);
        return null;
      }

      const day = lastRefillDate.getDate();
      const month = lastRefillDate.getMonth() + 1;
      const year = lastRefillDate.getFullYear();
      const formattedDate = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;

      const h = lastRefillDate.getHours();
      const m = lastRefillDate.getMinutes();
      const s = lastRefillDate.getSeconds();
      const formattedTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

      // Calculate relative time
      const now = new Date();
      const diffMs = now.getTime() - lastRefillDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      console.log(
        "[v0] Time difference - MS:",
        diffMs,
        "Minutes:",
        diffMinutes,
        "Hours:",
        diffHours,
        "Days:",
        diffDays
      );

      let timeAgo;
      if (diffMinutes < 1) {
        timeAgo = "just now";
      } else if (diffMinutes < 60) {
        timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      } else {
        timeAgo = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
      }

      console.log("[v0] Final time ago:", timeAgo);

      return {
        date: lastRefillDate,
        formattedDate,
        formattedTime,
        timeAgo,
      };
    } catch (error) {
      console.log("[v0] Error in date processing:", error);
      return null;
    }
  }, [machine]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Summary Card */}
        <Card className="border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CupSoda className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-2xl font-bold">
                {transactionMetrics.totalCups} cups
              </span>
            </div>
            <div className="flex items-center mt-2">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-xl font-medium">
                ₹{transactionMetrics.totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total sales to date
            </p>
          </CardContent>
        </Card>

        {/* Transaction Status Card */}
        <Card className="border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Transaction Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.paidTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <Clock3 className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.activeTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-lg font-bold mt-1">
                  {transactionMetrics.canceledTransactions}
                </p>
                <p className="text-xs text-muted-foreground">Canceled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Refilled</CardTitle>
          </CardHeader>
          <CardContent>
            {lastRefillTime ? (
              <>
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2 text-purple-500" />
                  <span className="text-xl font-bold">
                    {lastRefillTime.formattedDate}
                  </span>
                </div>
                <p className="text-sm mt-2">
                  <span className="font-medium">{lastRefillTime.timeAgo}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {lastRefillTime.formattedTime}
                </p>
              </>
            ) : (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                <span className="text-xl font-bold">No refill data</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Last canister refill
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div
                className={`h-4 w-4 rounded-full mr-2 ${machine.status === "online" &&
                  !isMachineUnreachable(machine.status, machine.lastSeenAt, now)
                  ? "bg-green-500"
                  : "bg-red-500"
                  }`}
              ></div>
              <span className="text-2xl font-bold">
                {isMachineUnreachable(machine.status, machine.lastSeenAt, now)
                  ? "Offline"
                  : machine.status === "online"
                    ? "Online"
                    : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last ping is: {machine.lastSeenAt
                ? new Date(machine.lastSeenAt).toLocaleString()
                : "never"}
            </p>
          </CardContent>
        </Card>

        {/* Temperature Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Thermometer className="h-5 w-5 mr-2 text-orange-500" />
              <span className="text-2xl font-bold">
                {machine.temperature}°C
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Optimal range: 80°C - 82°C
            </p>
          </CardContent>
        </Card>

        {/* Water Level Card — simple presence indicator, separate from the
            alert system (Maintenance tab / Alerts dialog), which is unchanged.
            ESP32 reports waterLevelLow=true meaning water is NOT present. */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Water Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Droplet
                className={`h-5 w-5 mr-2 ${machine.waterLevelLow ? "text-red-500" : "text-blue-500"}`}
              />
              <span className="text-2xl font-bold">
                {machine.waterLevelLow ? "Not Present" : "Present"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {machine.waterLevelLow
                ? "Tank is empty — refill needed"
                : "Tank has water"}
            </p>
          </CardContent>
        </Card>

        {/* Canister Level Card */}
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
                  {deriveCanisterLevel(machine.cups)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {deriveCanisterLevel(machine.cups) < 20
                    ? "Low"
                    : deriveCanisterLevel(machine.cups) < 50
                      ? "Medium"
                      : "Good"}
                </span>
              </div>
              <Progress value={deriveCanisterLevel(machine.cups)} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {deriveCanisterLevel(machine.cups) < 20
                ? "Refill needed soon"
                : deriveCanisterLevel(machine.cups) < 50
                  ? "Monitor levels"
                  : "Level is good"}
            </p>
          </CardContent>
        </Card>

        {/* Remote Monitoring Card — current screen + Pi system health,
            reported on the same 60s heartbeat as lastSeenAt */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remote Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current screen</span>
                <span className="font-medium">{machine.currentPage || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">App version</span>
                <span className="font-medium">
                  {machine.appVersion !== undefined ? `v${machine.appVersion}` : "legacy"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-medium">
                  {machine.cpuPercent !== undefined ? `${machine.cpuPercent}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-medium">
                  {machine.memPercent !== undefined ? `${machine.memPercent}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disk</span>
                <span className="font-medium">
                  {machine.diskPercent !== undefined ? `${machine.diskPercent}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">
                  {machine.latencyMs !== undefined ? (
                    <span
                      className={
                        machine.latencyMs < 100
                          ? "text-green-500" // Excellent
                          : machine.latencyMs < 300
                            ? "text-yellow-500" // Fair
                            : "text-red-500" // Poor
                      }
                    >
                      {machine.latencyMs.toFixed(1)} ms
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Updated on the same ~60s heartbeat as last-seen status
            </p>
          </CardContent>
        </Card>

        {/* Test Dispense Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Machine Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <Button 
              className="w-full h-12"
              variant="outline"
              onClick={handleTestDispense}
              disabled={isDispensing || machine.status === "offline" || isMachineUnreachable(machine.status, machine.lastSeenAt, now)}
            >
              <PlayIcon className="mr-2 h-4 w-4" />
              {isDispensing ? "Sending..." : "Test Dispense"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Remotely trigger a dispense (e.g. after refill)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Daily cup sales for the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {transactionMetrics.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={transactionMetrics.dailySales}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="cups"
                    name="Cups Sold"
                    fill="#4ade80"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Sales Data</h3>
                  <p className="text-muted-foreground">
                    No sales have been recorded for this machine yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Machine Description */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{machine.description}</p>
        </CardContent>
      </Card>

      {/* Replenishment Status */}
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
                  {new Date(machine.replenishmentOrder.eta).toLocaleString()}
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
                      ? new Date(machine.deliveryBoy.eta).toLocaleTimeString()
                      : "Unknown"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
