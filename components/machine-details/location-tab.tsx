"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface LocationTabProps {
  machine: any;
}

export function LocationTab({ machine }: LocationTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Address
              </h3>
              <div className="p-4 border rounded-md bg-muted/30">
                <p className="font-medium">{machine.address.building}</p>
                <p>Floor: {machine.address.floor}</p>
                <p>{machine.address.area}</p>
                <p>
                  {machine.address.district}, {machine.address.state}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                GPS Coordinates
              </h3>
              <div className="p-4 border rounded-md bg-muted/30 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-red-500" />
                <div>
                  <p>Latitude: {machine.gisLatitude}</p>
                  <p>Longitude: {machine.gisLongitude}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Map
            </h3>
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">
                Map view would be displayed here
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            <MapPin className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
