"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, SortAsc, SortDesc } from "lucide-react";
import { deriveCanisterLevel, isMachineUnreachable, useNow, isWithinOperatingHours } from "@/lib/utils";

interface Machine {
  _id: Id<"machines">;
  id: string;
  name: string;
  status: string;
  temperature: number;
  canisterLevel: number;
  cups?: number; // Added cups field
  waterLevelLow?: boolean;
  lastFulfilled: string;
  lastSeenAt?: number;
  startTime?: string;
  endTime?: string;
}

interface MachinesTableProps {
  machines: Machine[];
  onMachineSelect: (id: Id<"machines">) => void;
  onStatusToggle: (machine: Machine) => void;
}

const formatRelativeTime = (dateString: string | undefined): string => {
  if (!dateString || dateString === "N/A" || dateString === "0" || dateString.trim() === "") {
    return "N/A";
  }

  const now = new Date();

  let date: Date;
  try {
    // Parse DD/MM/YYYY HH:MM:SS format (like "25/06/2025, 16:08:28")
    if (dateString.includes("/")) {
      // Split the date and time parts
      const [datePart, timePart] = dateString.split(", ");
      const [day, month, year] = datePart.split("/");

      // Create date string in MM/DD/YYYY format for JavaScript Date constructor
      const formattedDateString = `${month}/${day}/${year}${timePart ? `, ${timePart}` : ""}`;
      date = new Date(formattedDateString);
    } else {
      // If it's a timestamp, convert it
      const numDate = Number.parseInt(dateString, 10);
      if (numDate < 1000000000) {
        // likely 0 or very small number, return N/A rather than 1970
        return "N/A";
      }
      date = new Date(numDate);
    }

    // If date is invalid, return the original string
    if (isNaN(date.getTime())) {
      return dateString;
    }
  } catch (error) {
    return dateString;
  }

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return "just now"; // Catch future dates
  }

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}hr${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
};

export function MachinesTable({
  machines,
  onMachineSelect,
  onStatusToggle,
}: MachinesTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pendingMachine, setPendingMachine] = useState<Machine | null>(null);
  const now = useNow();

  const filteredMachines = machines.filter(
    (machine) =>
      machine.name.toLowerCase().includes(search.toLowerCase()) ||
      machine.id.toLowerCase().includes(search.toLowerCase())
  );

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    const aValue = a[sortField as keyof Machine];
    const bValue = b[sortField as keyof Machine];

    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortDirection === "asc" ? 1 : -1;
    if (bValue === undefined) return sortDirection === "asc" ? -1 : 1;

    return sortDirection === "asc"
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
        ? 1
        : -1;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleConfirmToggle = () => {
    if (pendingMachine) {
      onStatusToggle(pendingMachine);
      setPendingMachine(null);
    }
  };

  const goingOnline = pendingMachine ? (pendingMachine.status === "offline" || isMachineUnreachable(pendingMachine.status, pendingMachine.lastSeenAt, now)) : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle>All Vending Machines</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("id")}
                    className="flex items-center gap-2"
                  >
                    ID
                    {sortField === "id" &&
                      (sortDirection === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      ))}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2"
                  >
                    Name
                    {sortField === "name" &&
                      (sortDirection === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      ))}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Water Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("cups")}
                    className="flex items-center gap-2"
                  >
                    Cups Remaining
                    {sortField === "cups" &&
                      (sortDirection === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      ))}
                  </Button>
                </TableHead>
                <TableHead>Since Last Refilled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {sortedMachines.map((machine) => (
                  <motion.tr
                    key={machine._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onMachineSelect(machine._id)}
                  >
                    <TableCell>{machine.id}</TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>
                      {isMachineUnreachable(machine.status, machine.lastSeenAt, now) ? (
                        <Badge variant="destructive">offline</Badge>
                      ) : (
                        <Badge
                          variant={
                            machine.status === "online" ? "success" : "destructive"
                          }
                        >
                          {machine.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          machine.temperature >= 80 && machine.temperature <= 83
                            ? "default"
                            : machine.temperature >= 79 &&
                                machine.temperature < 80
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {machine.temperature}°C
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          machine.waterLevelLow
                            ? "destructive"
                            : "success"
                        }
                      >
                        {machine.waterLevelLow ? "Not Present" : "Present"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (machine.cups || 0) < 10
                            ? "destructive"
                            : (machine.cups || 0) < 25
                              ? "warning"
                              : "default"
                        }
                      >
                        {machine.cups || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(machine.lastFulfilled)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-right flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <div title={!isWithinOperatingHours(machine.startTime, machine.endTime) ? "Cannot toggle during non-operating hours" : undefined}>
                          <Switch
                            disabled={!isWithinOperatingHours(machine.startTime, machine.endTime)}
                            checked={machine.status === "online" && !isMachineUnreachable(machine.status, machine.lastSeenAt, now)}
                            onCheckedChange={() => {
                              if (isWithinOperatingHours(machine.startTime, machine.endTime)) {
                                setPendingMachine(machine);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog
        open={pendingMachine !== null}
        onOpenChange={(open) => !open && setPendingMachine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Take this machine {goingOnline ? "online" : "offline"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMachine &&
                (goingOnline
                  ? `${pendingMachine.name} will start heating and accepting orders.`
                  : `${pendingMachine.name} will stop accepting orders and the kiosk will show the maintenance screen.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
