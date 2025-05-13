"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Phone, Truck, FileText, Loader2 } from "lucide-react";
import { formatDistance, getStatusVariant } from "@/lib/format";

interface RequestsTabProps {
  agentId: string;
}

export default function RequestsTab({ agentId }: RequestsTabProps) {
  // Fetch requests for this agent
  const requests =
    useQuery(api.requests.getByAgentUserId, { agentUserId: agentId }) || [];

  // Loading state
  const isLoading = requests === undefined;

  // Get active requests (specifically Assigned or Refilled status)
  const activeRequests = requests.filter(
    (r) => r.requestStatus === "Assigned" || r.requestStatus === "Refilled"
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading requests data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
          <CardDescription>
            Current requests assigned to this delivery agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Machine ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRequests.map((request) => (
                    <TableRow key={request.requestId}>
                      <TableCell>{request.requestId}</TableCell>
                      <TableCell>{request.machineId}</TableCell>
                      <TableCell>
                        {new Date(request.requestDateTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(request.requestStatus)}
                        >
                          {request.requestStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.totalDistance
                          ? formatDistance(request.totalDistance)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Requests</h3>
              <p className="text-muted-foreground">
                This delivery agent has no active requests at the moment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Information about source and destination
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRequests.length > 0 ? (
            <div className="space-y-6">
              {activeRequests.slice(0, 2).map((request, index) => (
                <div key={index} className="p-4 border rounded-md bg-muted/30">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-medium">
                        Request #{request.requestId}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Machine: {request.machineId}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(request.requestStatus)}>
                      {request.requestStatus}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Source</p>
                        <p className="text-sm">
                          {request.srcAddress || "Not specified"}
                        </p>
                        {request.srcContactName && (
                          <p className="text-xs text-muted-foreground">
                            Contact: {request.srcContactName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Destination</p>
                        <p className="text-sm">
                          {request.dstAddress || "Not specified"}
                        </p>
                        {request.dstContactName && (
                          <p className="text-xs text-muted-foreground">
                            Contact: {request.dstContactName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Distance
                        </p>
                        <p className="font-medium">
                          {request.totalDistance
                            ? formatDistance(request.totalDistance)
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Tea Type
                        </p>
                        <p className="font-medium">
                          {request.teaType || "Standard"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <MapPin className="h-4 w-4 mr-2" />
                      Navigate
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Requests</h3>
              <p className="text-muted-foreground">
                There are no active or pending requests to display details for.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
