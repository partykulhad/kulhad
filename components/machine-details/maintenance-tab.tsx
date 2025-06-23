"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Settings, AlertTriangle } from "lucide-react";

interface MaintenanceTabProps {
  machine: any;
}

export function MaintenanceTab({ machine }: MaintenanceTabProps) {
  return (
    <div className="space-y-6">
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
            <h3 className="text-lg font-medium mb-2">No Maintenance Records</h3>
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
          <CardDescription>Machine performance and SLO data</CardDescription>
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
              <h3 className="text-lg font-medium mb-2">No Performance Data</h3>
              <p className="text-muted-foreground">
                Performance metrics are not available for this machine.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
