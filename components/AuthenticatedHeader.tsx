"use client";

import type React from "react";

import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboardIcon,
  PlusCircleIcon,
  UserPlusIcon,
  TruckIcon,
  MenuIcon,
  AlertCircleIcon,
  WifiOffIcon,
  ThermometerIcon,
  BellIcon,
} from "lucide-react";

import { Loading } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { AlertsDialog } from "@/components/alerts-dialog";

interface HeaderProps {
  selectedMachine: string;
  setSelectedMachine: (value: string) => void;
  setActiveTab: (value: string) => void;
  vendingMachines: Array<{
    _id: string;
    name: string;
    status?: string;
    temperature?: number;
    canisterLevel?: number;
  }>;
}

const Header: React.FC<HeaderProps> = ({
  selectedMachine,
  setSelectedMachine,
  setActiveTab,
  vendingMachines,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Calculate machine stats
  const offlineMachines = vendingMachines.filter(
    (m) => m.status === "offline"
  ).length;
  const lowInventoryMachines = vendingMachines.filter(
    (m) => (m.canisterLevel || 0) < 20
  ).length;
  const temperatureAlerts = vendingMachines.filter((m) => {
    const temp = m.temperature || 0;
    return temp > 75 || temp < 65;
  }).length;

  const totalAlerts =
    offlineMachines + lowInventoryMachines + temperatureAlerts;

  return (
    <header
      className={cn(
        "w-full border-b border-border/40 z-50 sticky top-0",
        "bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div className="w-full border-b border-border/40 bg-muted/50">
        <div className="lg:px-10 px-5 py-2 mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <WifiOffIcon className="h-4 w-4" />
                    <span>{offlineMachines} offline</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Machines currently offline</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>{lowInventoryMachines} low inventory</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Machines with low inventory</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <ThermometerIcon className="h-4 w-4" />
                    <span>{temperatureAlerts} temperature alerts</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Machines with temperature issues</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {totalAlerts > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setAlertsOpen(true)}
            >
              <BellIcon className="h-4 w-4 mr-1" />
              {totalAlerts} alerts
              <Badge variant="destructive" className="ml-2">
                {totalAlerts}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      <nav className="lg:px-10 px-5 py-3 mx-auto flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden block p-2 rounded-md border border-border"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <Logo />
        </div>
        <div
          className={cn(
            "lg:flex hidden items-center space-x-4",
            menuOpen ? "block" : "hidden"
          )}
        >
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a vending machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vending Machines</SelectItem>
              {vendingMachines.map((machine) => (
                <SelectItem key={machine._id} value={machine._id}>
                  <div className="flex items-center gap-2">
                    {machine.name}
                    {machine.status === "offline" && (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                    {(machine.canisterLevel || 0) < 20 && (
                      <Badge variant="destructive">Low</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboardIcon className="mr-2 h-4 w-4" /> Overview
          </Button>
          <Button variant="outline" onClick={() => setActiveTab("addMachine")}>
            <PlusCircleIcon className="mr-2 h-4 w-4" /> Machine
          </Button>
          <Button variant="outline" onClick={() => setActiveTab("addKitchen")}>
            <UserPlusIcon className="mr-2 h-4 w-4" /> Kitchen
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("deliveryAgents")}
          >
            <TruckIcon className="mr-2 h-4 w-4" /> Delivery Agents
          </Button>
        </div>

        <div className="flex gap-4 justify-end items-center">
          <AuthLoading>
            <Loading />
          </AuthLoading>
          <Unauthenticated>
            <SignInButton mode="modal" />
          </Unauthenticated>
          <Authenticated>
            <div className="flex justify-center items-center">
              <UserButton />
            </div>
          </Authenticated>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden block p-4 space-y-4 bg-background shadow-md">
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a vending machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vending Machines</SelectItem>
              {vendingMachines.map((machine) => (
                <SelectItem key={machine._id} value={machine._id}>
                  <div className="flex items-center gap-2">
                    {machine.name}
                    {machine.status === "offline" && (
                      <Badge variant="secondary">Offline</Badge>
                    )}
                    {(machine.canisterLevel || 0) < 20 && (
                      <Badge variant="destructive">Low</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("dashboard");
              setMenuOpen(false);
            }}
            className="w-full"
          >
            <LayoutDashboardIcon className="mr-2 h-4 w-4" /> Overview
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("addMachine");
              setMenuOpen(false);
            }}
            className="w-full"
          >
            <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Machine
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("addKitchen");
              setMenuOpen(false);
            }}
            className="w-full"
          >
            <UserPlusIcon className="mr-2 h-4 w-4" /> Add Kitchen
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActiveTab("deliveryAgents");
              setMenuOpen(false);
            }}
            className="w-full"
          >
            <TruckIcon className="mr-2 h-4 w-4" /> Delivery Agents
          </Button>
        </div>
      )}
      <AlertsDialog
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        machines={vendingMachines}
        onMachineSelect={setSelectedMachine}
        setActiveTab={setActiveTab}
      />
    </header>
  );
};

export default Header;
