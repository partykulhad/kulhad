"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Droplet } from "lucide-react";

interface DetailsTabProps {
  machine: any;
}

export function DetailsTab({ machine }: DetailsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
