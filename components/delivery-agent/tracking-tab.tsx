"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Truck,
  History,
  Clock,
  Compass,
  Route,
  AlertTriangle,
  Loader2,
  Navigation,
} from "lucide-react";
import {
  formatDate,
  formatDistance,
  formatDuration,
  getStatusVariant,
} from "@/lib/format";

// Define Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

interface TrackingTabProps {
  agentId: string;
  agent: any;
}

export default function TrackingTab({ agentId, agent }: TrackingTabProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Fetch data for this agent
  const requests =
    useQuery(api.requests.getByAgentUserId, { agentUserId: agentId }) || [];
  const currentLocation =
    useQuery(api.agentLocations.getCurrentLocation, { agentId }) || null;

  // Loading state
  const isLoading = requests === undefined || currentLocation === undefined;

  // Get active requests (Assigned, Ongoing, Refilled)
  const activeRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter(
      (r) =>
        r.requestStatus === "Assigned" ||
        r.requestStatus === "Ongoing" ||
        r.requestStatus === "Refilled"
    );
  }, [requests]);

  // Get completed requests for statistics
  const completedRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => r.requestStatus === "Completed");
  }, [requests]);

  // Calculate most visited locations
  const mostVisitedLocations = useMemo(() => {
    if (!completedRequests.length) return [];

    // Create a map to count visits by location
    const locationCounts = new Map();

    completedRequests.forEach((request) => {
      // Use machine ID or kitchen ID as location identifier
      const locationId = request.machineId || "unknown";
      const locationName = request.dstAddress || `Machine ${request.machineId}`;

      const key = `${locationId}:${locationName}`;
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
    });

    // Convert to array and sort by visit count
    return Array.from(locationCounts.entries())
      .map(([key, count]) => {
        const [id, name] = key.split(":");
        return { id, name, visits: count };
      })
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
  }, [completedRequests]);

  // Initialize Google Maps
  useEffect(() => {
    // Skip if map is already initialized
    if (mapInstanceRef.current) return;

    // Skip if Google Maps is not loaded
    if (!window.google || !window.google.maps) {
      console.warn("Google Maps API not loaded");
      return;
    }

    if (!mapRef.current) return;

    // Create a new map centered at a default location
    const mapOptions = {
      center: { lat: 19.076, lng: 72.8777 }, // Default to Mumbai
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Create a marker for the agent's location
    const marker = new window.google.maps.Marker({
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4ade80",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      title: agent.name || "Delivery Agent",
    });
    markerRef.current = marker;

    // Update marker position if we have location data
    if (
      currentLocation &&
      currentLocation.latitude &&
      currentLocation.longitude
    ) {
      const position = {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      };
      marker.setPosition(position);
      map.setCenter(position);
    }
  }, [agent, currentLocation]);

  // Update marker position when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !currentLocation)
      return;

    // Check if we have valid location data
    if (
      currentLocation &&
      typeof currentLocation.latitude === "number" &&
      typeof currentLocation.longitude === "number"
    ) {
      const position = {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      };
      markerRef.current.setPosition(position);
      mapInstanceRef.current.setCenter(position);
    }
  }, [currentLocation]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading tracking data...</span>
      </div>
    );
  }

  // Calculate delivery progress based on status
  const getDeliveryProgress = (status: string) => {
    switch (status) {
      case "Assigned":
        return 25;
      case "Ongoing":
        return 50;
      case "Refilled":
        return 75;
      case "Completed":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Location Tracking</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Location</CardTitle>
          <CardDescription>
            Real-time location of the delivery agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative">
            {/* Google Maps container */}
            <div ref={mapRef} className="absolute inset-0 rounded-md"></div>

            {/* Fallback if no location data */}
            {(!currentLocation ||
              typeof currentLocation.latitude !== "number" ||
              typeof currentLocation.longitude !== "number") && (
              <div className="relative z-10 text-center bg-white/80 p-4 rounded-md">
                <MapPin className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="font-medium">No Location Data</p>
                <p className="text-muted-foreground">
                  Current location data is not available for this agent
                </p>
              </div>
            )}
          </div>

          {/* Location coordinates display */}
          {currentLocation &&
            typeof currentLocation.latitude === "number" &&
            typeof currentLocation.longitude === "number" && (
              <div className="mt-4 p-3 bg-muted/30 rounded-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-sm font-medium">
                      Current Coordinates
                    </span>
                  </div>
                  <span className="text-sm">
                    {currentLocation.latitude.toFixed(6)},{" "}
                    {currentLocation.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">
            <Compass className="h-4 w-4 mr-2" />
            Navigate
          </Button>
          <Button variant="outline">
            <History className="h-4 w-4 mr-2" />
            View Timeline
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Trip Details</CardTitle>
            <CardDescription>Active delivery information</CardDescription>
          </CardHeader>
          <CardContent>
            {activeRequests.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="font-medium">Current Delivery</span>
                  </div>
                  <Badge
                    variant={getStatusVariant(activeRequests[0].requestStatus)}
                  >
                    {activeRequests[0].requestStatus}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Request ID
                    </span>
                    <span className="font-medium">
                      {activeRequests[0].requestId || "N/A"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Machine ID
                    </span>
                    <span className="font-medium">
                      {activeRequests[0].machineId || "N/A"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Started
                    </span>
                    <span className="font-medium">
                      {formatDate(activeRequests[0].requestDateTime)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <span className="font-medium">
                      {activeRequests[0].requestStatus}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Distance
                    </span>
                    <span className="font-medium">
                      {activeRequests[0].totalDistance
                        ? formatDistance(activeRequests[0].totalDistance)
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">
                    Delivery Progress
                  </h4>
                  <Progress
                    value={getDeliveryProgress(activeRequests[0].requestStatus)}
                    className="h-2 mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Assigned</span>
                    <span>Ongoing</span>
                    <span>Refilled</span>
                    <span>Completed</span>
                  </div>
                </div>

                {/* Destination information */}
                {activeRequests[0].dstAddress && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Destination</p>
                        <p className="text-sm">
                          {activeRequests[0].dstAddress}
                        </p>
                        {activeRequests[0].dstContactName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Contact: {activeRequests[0].dstContactName}
                            {activeRequests[0].dstContactNumber &&
                              ` (${activeRequests[0].dstContactNumber})`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end mt-2">
                      <Button size="sm" variant="outline">
                        <Navigation className="h-3 w-3 mr-1" />
                        Navigate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Trip</h3>
                <p className="text-muted-foreground">
                  The delivery agent is not currently on an active delivery.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Statistics</CardTitle>
            <CardDescription>Movement and location data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center mb-2">
                    <Route className="h-5 w-5 mr-2 text-blue-500" />
                    <span className="font-medium">Today's Distance</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatDistance(
                      requests
                        .filter((r) => {
                          const requestDate = new Date(r.requestDateTime);
                          const today = new Date();
                          return (
                            requestDate.getDate() === today.getDate() &&
                            requestDate.getMonth() === today.getMonth() &&
                            requestDate.getFullYear() === today.getFullYear() &&
                            r.totalDistance
                          );
                        })
                        .reduce((sum, r) => sum + (r.totalDistance || 0), 0)
                    )}
                  </p>
                </div>

                <div className="p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 mr-2 text-green-500" />
                    <span className="font-medium">Active Hours</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatDuration(
                      requests.filter((r) => {
                        const requestDate = new Date(r.requestDateTime);
                        const today = new Date();
                        return (
                          requestDate.getDate() === today.getDate() &&
                          requestDate.getMonth() === today.getMonth() &&
                          requestDate.getFullYear() === today.getFullYear()
                        );
                      }).length * 30
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Most Visited Locations</h4>
                <div className="space-y-2">
                  {mostVisitedLocations.length > 0 ? (
                    mostVisitedLocations.map((location, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-red-500" />
                          <span>{location.name}</span>
                        </div>
                        <span className="text-sm">
                          {location.visits} visits
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">
                        No location visit data available
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Completed Deliveries</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-green-500" />
                    <span>Total Completed</span>
                  </div>
                  <span className="text-xl font-medium">
                    {completedRequests.length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Route className="h-5 w-5 mr-2 text-blue-500" />
                    <span>Total Distance</span>
                  </div>
                  <span className="text-xl font-medium">
                    {formatDistance(
                      completedRequests.reduce(
                        (sum, r) => sum + (r.totalDistance || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Delivery Locations</CardTitle>
          <CardDescription>
            Source and destination addresses for recent deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.filter(
              (request) => request.srcAddress || request.dstAddress
            ).length > 0 ? (
              requests
                .filter((request) => request.srcAddress || request.dstAddress)
                .slice(0, 3)
                .map((request, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-md bg-muted/30"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="font-medium">
                          Request #{request.requestId}
                        </span>
                      </div>
                      <Badge variant={getStatusVariant(request.requestStatus)}>
                        {request.requestStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Source
                          </p>
                          <p className="text-sm font-medium">
                            {request.srcAddress || "Not specified"}
                          </p>
                          {typeof request.srcLatitude === "number" &&
                            typeof request.srcLongitude === "number" && (
                              <p className="text-xs text-muted-foreground">
                                {request.srcLatitude.toFixed(6)},{" "}
                                {request.srcLongitude.toFixed(6)}
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Destination
                          </p>
                          <p className="text-sm font-medium">
                            {request.dstAddress || "Not specified"}
                          </p>
                          {typeof request.dstLatitude === "number" &&
                            typeof request.dstLongitude === "number" && (
                              <p className="text-xs text-muted-foreground">
                                {request.dstLatitude.toFixed(6)},{" "}
                                {request.dstLongitude.toFixed(6)}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      Request date: {formatDate(request.requestDateTime)}
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Location Data</h3>
                <p className="text-muted-foreground">
                  No delivery location data is available yet.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
