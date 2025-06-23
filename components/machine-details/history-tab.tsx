"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Truck } from "lucide-react";
import { formatDateForDisplay } from "@/lib/date-utils";

interface HistoryTabProps {
  machineData: any[];
  requests: any[];
}

export function HistoryTab({ machineData, requests }: HistoryTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Machine Data History</CardTitle>
          <CardDescription>Recent readings from the machine</CardDescription>
        </CardHeader>
        <CardContent>
          {machineData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Timestamp</th>
                    <th className="text-left py-3 px-4">Temperature</th>
                    <th className="text-left py-3 px-4">Canister Level</th>
                    <th className="text-left py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {machineData.map((data, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4">
                        {new Date(data.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {data.temperature !== undefined
                          ? `${data.temperature}°C`
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {data.canisterLevel !== undefined
                          ? `${data.canisterLevel}%`
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        {data.rating !== undefined ? `${data.rating}/5` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No History Available</h3>
              <p className="text-muted-foreground">
                No data has been recorded for this machine yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replenishment History</CardTitle>
          <CardDescription>Past replenishment requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Request ID</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Delivery Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.requestId} className="border-b">
                      <td className="py-3 px-4">{request.requestId}</td>
                      <td className="py-3 px-4">
                        {formatDateForDisplay(request.requestDateTime)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            request.requestStatus === "completed"
                              ? "success"
                              : request.requestStatus === "pending"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {request.requestStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {request.assignRefillerName || "Not assigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Replenishment History
              </h3>
              <p className="text-muted-foreground">
                No replenishment requests have been made for this machine.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
