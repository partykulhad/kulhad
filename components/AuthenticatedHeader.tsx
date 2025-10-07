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
  Coffee,
  UtensilsCrossed,
  XIcon,
  DropletIcon,
  ActivityIcon,
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
import { useState, useEffect } from "react";
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
    lastChecked?: string;
    address?: {
      building: string;
      area: string;
    };
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
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fixed: Use same filtering logic as AlertsDialog
  const offlineMachines = vendingMachines.filter(
    (m) => m.status === "offline"
  ).length;

  const lowInventoryMachines = vendingMachines.filter(
    (m) => (m.canisterLevel || 0) < 20
  ).length;

  const temperatureAlerts = vendingMachines.filter((m) => {
    const temp = m.temperature || 0;
    return temp <= 80; // FIXED: Same logic as AlertsDialog
  }).length;

  const totalAlerts =
    offlineMachines + lowInventoryMachines + temperatureAlerts;

  const navigationItems = [
    {
      id: "dashboard",
      label: "Overview",
      icon: LayoutDashboardIcon,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "addMachine",
      label: "Machines",
      icon: Coffee,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      id: "addKitchen",
      label: "Kitchens",
      icon: UtensilsCrossed,
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "deliveryAgents",
      label: "Delivery",
      icon: TruckIcon,
      color: "from-purple-500 to-purple-600",
    },
  ];

  return (
    <header
      className={cn(
        "w-full z-50 sticky top-0 transition-all duration-300",
        isScrolled
          ? "backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-lg shadow-black/5"
          : "bg-background/95 backdrop-blur-md border-b border-border/40"
      )}
    >
      {/* Status Bar */}
      <div
        className={cn(
          "w-full border-b transition-all duration-300",
          isScrolled
            ? "border-border/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50"
            : "border-border/20 bg-muted/30"
        )}
      >
        <div className="lg:px-10 px-5 py-3 mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-all duration-200">
                    <div className="p-1 rounded-full bg-gray-500/10">
                      <WifiOffIcon className="h-3 w-3 text-gray-600 dark:text-gray-300" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {offlineMachines}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      offline
                    </span>
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 hover:shadow-md transition-all duration-200">
                    <div className="p-1 rounded-full bg-red-500/10">
                      <DropletIcon className="h-3 w-3 text-red-600 dark:text-red-300" />
                    </div>
                    <span className="font-medium text-red-700 dark:text-red-200">
                      {lowInventoryMachines}
                    </span>
                    <span className="text-red-500 dark:text-red-400">
                      low stock
                    </span>
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-200 dark:from-amber-900/30 dark:to-orange-800/30 hover:shadow-md transition-all duration-200">
                    <div className="p-1 rounded-full bg-amber-500/10">
                      <ThermometerIcon className="h-3 w-3 text-amber-600 dark:text-amber-300" />
                    </div>
                    <span className="font-medium text-amber-700 dark:text-amber-200">
                      {temperatureAlerts}
                    </span>
                    <span className="text-amber-500 dark:text-amber-400">
                      temp alerts
                    </span>
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
              className="relative overflow-hidden bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 border border-red-200/50 text-red-700 hover:text-red-800 transition-all duration-200 hover:shadow-lg hover:shadow-red-200/50"
              onClick={() => setAlertsOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5 animate-pulse" />
              <BellIcon className="h-4 w-4 mr-2 animate-bounce" />
              <span className="font-medium">
                {totalAlerts} Alert{totalAlerts !== 1 ? "s" : ""}
              </span>
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {totalAlerts}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="lg:px-10 px-5 py-4 mx-auto flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
          <button
            className={cn(
              "lg:hidden block p-3 rounded-xl border transition-all duration-200 hover:shadow-lg",
              "bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700",
              "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
              menuOpen &&
                "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
            )}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <MenuIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
          <Logo />
        </div>

        {/* Desktop Navigation */}
        <div className="lg:flex hidden items-center space-x-4">
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-[250px] h-11 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
              <SelectValue placeholder="Select a vending machine" />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl">
              <SelectItem
                value="all"
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
              >
                <div className="flex items-center gap-2">
                  <ActivityIcon className="h-4 w-4" />
                  All Vending Machines
                </div>
              </SelectItem>
              {vendingMachines.map((machine) => (
                <SelectItem
                  key={machine._id}
                  value={machine._id}
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    {machine.name}
                    <div className="flex gap-1">
                      {machine.status === "offline" && (
                        <Badge variant="secondary" className="text-xs">
                          Offline
                        </Badge>
                      )}
                      {(machine.canisterLevel || 0) < 20 && (
                        <Badge variant="destructive" className="text-xs">
                          Low
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "h-11 px-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700",
                "border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200",
                "hover:border-gray-300 dark:hover:border-gray-500 group relative overflow-hidden"
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200`}
              />
              <item.icon className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">{item.label}</span>
            </Button>
          ))}
        </div>

        {/* Auth Section */}
        <div className="flex gap-4 justify-end items-center">
          <AuthLoading>
            <Loading />
          </AuthLoading>
          <Unauthenticated>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-[1px] rounded-lg">
              <div className="bg-white dark:bg-gray-900 rounded-lg">
                <SignInButton mode="modal">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 h-10 px-6">
                    Sign In
                  </Button>
                </SignInButton>
              </div>
            </div>
          </Unauthenticated>
          <Authenticated>
            <div className="flex justify-center items-center p-1 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 hover:shadow-lg transition-all duration-200">
              <UserButton />
            </div>
          </Authenticated>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden block overflow-hidden">
          <div className="p-6 space-y-4 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10 backdrop-blur-xl border-t border-border/30">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-full h-12 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 shadow-sm">
                <SelectValue placeholder="Select a vending machine" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4" />
                    All Vending Machines
                  </div>
                </SelectItem>
                {vendingMachines.map((machine) => (
                  <SelectItem key={machine._id} value={machine._id}>
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      {machine.name}
                      <div className="flex gap-1">
                        {machine.status === "offline" && (
                          <Badge variant="secondary" className="text-xs">
                            Offline
                          </Badge>
                        )}
                        {(machine.canisterLevel || 0) < 20 && (
                          <Badge variant="destructive" className="text-xs">
                            Low
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => {
                  setActiveTab(item.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  "w-full h-12 justify-start bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700",
                  "border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200",
                  "hover:border-gray-300 dark:hover:border-gray-500 group relative overflow-hidden"
                )}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200`}
                />
                <item.icon className="mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                <span className="font-medium">{item.label}</span>
              </Button>
            ))}
          </div>
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
