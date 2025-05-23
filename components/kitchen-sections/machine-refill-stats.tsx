"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Coffee } from "lucide-react";

interface MachineStats {
  [machineId: string]: {
    totalQuantity: number;
    count: number;
    teaTypes: {
      [teaType: string]: number;
    };
  };
}

interface MachineRefillStatsProps {
  stats: {
    machineStats: MachineStats;
    totalRefills: number;
    totalQuantity: number;
  };
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export function MachineRefillStats({
  stats,
  timeframe,
  onTimeframeChange,
}: MachineRefillStatsProps) {
  // Convert machine stats to array and sort by total quantity
  const machineStatsArray = Object.entries(stats.machineStats)
    .map(([machineId, data]) => ({
      machineId,
      ...data,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Machine Refill Statistics</CardTitle>
            <CardDescription>Tea refill data by machine</CardDescription>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button
              variant={timeframe === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeframeChange("day")}
            >
              Daily
            </Button>
            <Button
              variant={timeframe === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeframeChange("month")}
            >
              Monthly
            </Button>
            <Button
              variant={timeframe === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeframeChange("all")}
            >
              All Time
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Refills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRefills}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Number of refill requests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalQuantity}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Total units of tea refilled
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Machines Serviced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {machineStatsArray.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Unique machines refilled
              </p>
            </CardContent>
          </Card>
        </div>

        {machineStatsArray.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine ID</TableHead>
                  <TableHead>Total Quantity</TableHead>
                  <TableHead>Refill Count</TableHead>
                  <TableHead>Avg. Quantity</TableHead>
                  <TableHead>Primary Tea Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineStatsArray.map((machine) => {
                  // Find the most used tea type
                  const teaTypes = Object.entries(machine.teaTypes);
                  const primaryTeaType =
                    teaTypes.length > 0
                      ? teaTypes.sort((a, b) => b[1] - a[1])[0][0]
                      : "Unknown";

                  // Calculate average quantity per refill
                  const avgQuantity =
                    machine.count > 0
                      ? (machine.totalQuantity / machine.count).toFixed(1)
                      : "0";

                  return (
                    <TableRow key={machine.machineId}>
                      <TableCell className="font-medium">
                        {machine.machineId}
                      </TableCell>
                      <TableCell>{machine.totalQuantity} units</TableCell>
                      <TableCell>{machine.count} refills</TableCell>
                      <TableCell>{avgQuantity} units/refill</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Coffee className="h-4 w-4 mr-2 text-muted-foreground" />
                          {primaryTeaType}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Refill Data</h3>
            <p className="text-muted-foreground">
              No machine refill data available for the selected timeframe.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
