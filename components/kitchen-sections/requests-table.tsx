import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { format } from "date-fns";

interface Request {
  _id: any;
  _creationTime: number;
  requestId: string;
  machineId: string;
  requestDateTime: string;
  requestStatus: string;
  assignRefillerName?: string;
  agentUserId?: string | string[];
  agentId?: string;
  kitchenUserId?: string | string[];
  kitchenStatus?: string;
  agentStatus?: string;
  srcAddress?: string;
  destAddress?: string;
  teaType?: string;
  quantity?: number;
  reason?: string;
  orderReady?: string;
  acceptedAt?: string;
}

interface RequestStatusUpdate {
  requestId: string;
  userId: string;
  status: string;
  dateAndTime: string;
  reason?: string;
  teaType?: string;
  quantity?: number;
  message?: string;
}

interface RequestsTableProps {
  requests: Request[];
  statusUpdates: RequestStatusUpdate[];
  showCancelReason?: boolean;
  emptyMessage: string;
  emptyIcon: ReactNode;
}

export function RequestsTable({
  requests,
  statusUpdates,
  showCancelReason = false,
  emptyMessage,
  emptyIcon,
}: RequestsTableProps) {
  // Function to get the latest status update for a request
  const getLatestStatusUpdate = (requestId: string) => {
    const updates = statusUpdates
      .filter((update) => update.requestId === requestId)
      .sort(
        (a, b) =>
          new Date(b.dateAndTime).getTime() - new Date(a.dateAndTime).getTime()
      );

    return updates.length > 0 ? updates[0] : null;
  };

  // Function to get cancel reason for a request
  const getCancelReason = (requestId: string) => {
    const cancelUpdate = statusUpdates
      .filter(
        (update) =>
          update.requestId === requestId && update.status === "Canceled"
      )
      .sort(
        (a, b) =>
          new Date(b.dateAndTime).getTime() - new Date(a.dateAndTime).getTime()
      );

    return cancelUpdate.length > 0
      ? cancelUpdate[0].reason || "No reason provided"
      : "No reason provided";
  };

  // Format date
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP p");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "outline";
      case "OrderReady":
        return "secondary";
      case "Completed":
        return "success";
      case "Canceled":
        return "destructive";
      default:
        return "default";
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        {emptyIcon}
        <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground">
          No requests found in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request ID</TableHead>
            <TableHead>Machine ID</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tea Type</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Delivery Agent</TableHead>
            <TableHead>AcceptedAt</TableHead>
            <TableHead>orderReadyAt</TableHead>
            {showCancelReason && <TableHead>Cancel Reason</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const latestUpdate = getLatestStatusUpdate(request.requestId);
            const teaType =
              request.teaType || latestUpdate?.teaType || "Not specified";
            const quantity = request.quantity || latestUpdate?.quantity || 0;

            return (
              <TableRow key={request.requestId}>
                <TableCell className="font-medium">
                  {request.requestId}
                </TableCell>
                <TableCell>{request.machineId}</TableCell>
                <TableCell>{formatDateTime(request.requestDateTime)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(request.requestStatus)}>
                    {request.requestStatus}
                  </Badge>
                </TableCell>
                <TableCell>{teaType}</TableCell>
                <TableCell>{quantity} units</TableCell>
                <TableCell>
                  {request.assignRefillerName || "Not assigned"}
                </TableCell>
                <TableCell>{request.acceptedAt} </TableCell>
                <TableCell>{request.orderReady} </TableCell>
                {showCancelReason && (
                  <TableCell>{getCancelReason(request.requestId)}</TableCell>
                )}
                <TableCell>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
