"use client";

import type React from "react";

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
import { Search, SortAsc, SortDesc } from "lucide-react";

interface Machine {
  _id: Id<"machines">;
  id: string;
  name: string;
  status: string;
  temperature: number;
  canisterLevel: number;
  lastFulfilled: string;
}

interface MachinesTableProps {
  machines: Machine[];
  onMachineSelect: (id: Id<"machines">) => void;
  onStatusToggle: (id: Id<"machines">) => void;
}

export function MachinesTable({
  machines,
  onMachineSelect,
  onStatusToggle,
}: MachinesTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredMachines = machines.filter(
    (machine) =>
      machine.name.toLowerCase().includes(search.toLowerCase()) ||
      machine.id.toLowerCase().includes(search.toLowerCase())
  );

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    const aValue = a[sortField as keyof Machine];
    const bValue = b[sortField as keyof Machine];
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

  const handleSwitchClick = (
    e: React.MouseEvent,
    machineId: Id<"machines">
  ) => {
    e.stopPropagation();
    onStatusToggle(machineId);
  };

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
                <TableHead>Canister Level</TableHead>
                <TableHead>Last Fulfilled</TableHead>
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
                      <Badge
                        variant={
                          machine.status === "online" ? "success" : "secondary"
                        }
                      >
                        {machine.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          machine.temperature > 75
                            ? "destructive"
                            : machine.temperature < 65
                              ? "warning"
                              : "default"
                        }
                      >
                        {machine.temperature}°C
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          machine.canisterLevel < 20
                            ? "destructive"
                            : machine.canisterLevel < 40
                              ? "warning"
                              : "default"
                        }
                      >
                        {machine.canisterLevel}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(machine.lastFulfilled).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={machine.status === "online"}
                          onCheckedChange={() => onStatusToggle(machine._id)}
                        />
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
