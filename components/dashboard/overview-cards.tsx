"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CoffeeIcon,
  ThermometerIcon,
  DropletIcon,
  AlertCircleIcon,
} from "lucide-react";
import { motion } from "framer-motion";

interface OverviewCardsProps {
  machines: any[];
  totalSales: number;
  alerts: { low: number; maintenance: number };
}

export function OverviewCards({
  machines,
  totalSales,
  alerts,
}: OverviewCardsProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <motion.div variants={item}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Machines
            </CardTitle>
            <CoffeeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <div className="flex items-center mt-1 space-x-2">
              <Badge variant="success" className="h-auto">
                {machines.filter((m) => m.status === "online").length} Online
              </Badge>
              <Badge variant="secondary" className="h-auto">
                {machines.filter((m) => m.status === "offline").length} Offline
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales Today
            </CardTitle>
            <DropletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(totalSales / 2.5)} cups served today
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Average Temperature
            </CardTitle>
            <ThermometerIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                machines.reduce((acc, m) => acc + m.temperature, 0) /
                  machines.length
              )}
              °C
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Optimal range: 65°C - 75°C
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.low + alerts.maintenance}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              <Badge variant="destructive" className="h-auto">
                {alerts.low} Low Inventory
              </Badge>
              <Badge variant="warning" className="h-auto">
                {alerts.maintenance} Maintenance
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
