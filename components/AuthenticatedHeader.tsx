"use client";

import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  CoffeeIcon,
  LayoutDashboardIcon,
  UsersIcon,
  PlusCircleIcon,
  UserPlusIcon,
  TruckIcon,
} from "lucide-react";

import { Loading } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeaderProps {
  selectedMachine: string;
  setSelectedMachine: (value: string) => void;
  setActiveTab: (value: string) => void;
  vendingMachines: Array<{ _id: string; name: string }>;
}

const Header: React.FC<HeaderProps> = ({
  selectedMachine,
  setSelectedMachine,
  setActiveTab,
  vendingMachines,
}) => {
  return (
    <header
      className={cn(
        "w-full border-b bottom-2 border-border/40 z-50 sticky top-0",
        "bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <nav className="lg:px-20 px-5 py-3 mx-auto">
        <div className="flex justify-between items-center w-full">
          <Logo />
          <div className="flex items-center space-x-4">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a vending machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vending Machines</SelectItem>
                {vendingMachines.map((machine) => (
                  <SelectItem key={machine._id} value={machine._id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setActiveTab("dashboard")}>
              <LayoutDashboardIcon className="mr-2 h-4 w-4" /> Overview
            </Button>
            {/* <Button variant="outline" onClick={() => setActiveTab("vendors")}>
              <UsersIcon className="mr-2 h-4 w-4" /> Vendors
            </Button> */}
            <Button
              variant="outline"
              onClick={() => setActiveTab("addMachine")}
            >
              <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Machine
            </Button>
            {/* <Button variant="outline" onClick={() => setActiveTab("addVendor")}>
              <UserPlusIcon className="mr-2 h-4 w-4" /> Add Vendor
            </Button> */}
            <Button
              variant="outline"
              onClick={() => setActiveTab("addKitchen")}
            >
              <UserPlusIcon className="mr-2 h-4 w-4" /> Add Kitchen
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
        </div>
      </nav>
    </header>
  );
};

export default Header;
