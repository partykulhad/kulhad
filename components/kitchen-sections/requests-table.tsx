"use client";

import { useState, useMemo } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { CalendarIcon, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatDateTime";

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
  completedAt?: string;
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
  // Filter state (same as history tab)
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  // Helper function to check if a date is within the selected range (same as history tab)
  const isDateInRange = (dateString: string | undefined) => {
    if (!dateString) return false;
    if (!fromDate && !toDate) return true;

    const date = new Date(dateString);
    const from = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)) : null;
    const to = toDate ? new Date(toDate.setHours(23, 59, 59, 999)) : null;

    if (from && to) {
      return date >= from && date <= to;
    } else if (from) {
      return date >= from;
    } else if (to) {
      return date <= to;
    }

    return true;
  };

  // Filter requests based on date range (same logic as history tab)
  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    return requests.filter((request) => {
      // Date filter - check multiple date fields for filtering (same as history tab)
      const dateMatch =
        isDateInRange(request.requestDateTime) ||
        isDateInRange(request.acceptedAt) ||
        isDateInRange(request.orderReady) ||
        isDateInRange(request.completedAt);

      // Status filter
      const statusMatch =
        statusFilter === "all" || request.requestStatus === statusFilter;

      // Search filter
      const searchMatch =
        searchTerm === "" ||
        request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.assignRefillerName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.teaType?.toLowerCase().includes(searchTerm.toLowerCase());

      return dateMatch && statusMatch && searchMatch;
    });
  }, [requests, fromDate, toDate, statusFilter, searchTerm]);

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

  // Clear filters function (same as history tab)
  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setStatusFilter("all");
    setSearchTerm("");
  };

  // Get unique statuses for filter dropdown
  const uniqueStatuses = Array.from(
    new Set(requests.map((r) => r.requestStatus))
  );

  return (
    <div className="space-y-4">
      {/* Filter Section (same structure as history tab) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Filter requests by date, status, or search terms
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date (same as history tab) */}
              <div className="space-y-2">
                <Label htmlFor="from-date">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date (same as history tab) */}
              <div className="space-y-2">
                <Label htmlFor="to-date">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={
                    !fromDate &&
                    !toDate &&
                    statusFilter === "all" &&
                    searchTerm === ""
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Filter Summary (same as history tab) */}
            {(fromDate || toDate || statusFilter !== "all" || searchTerm) && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredRequests.length} of {requests.length}{" "}
                  requests
                  {fromDate && ` from ${format(fromDate, "PPP")}`}
                  {toDate && ` to ${format(toDate, "PPP")}`}
                  {statusFilter !== "all" && ` with status "${statusFilter}"`}
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8">
          {emptyIcon}
          <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground">
            {fromDate || toDate || statusFilter !== "all" || searchTerm
              ? "No requests found matching the current filters."
              : "No requests found in this category."}
          </p>
        </div>
      ) : (
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
                <TableHead>Accepted At</TableHead>
                <TableHead>Order Ready At</TableHead>
                <TableHead>Completed At</TableHead>
                {showCancelReason && <TableHead>Cancel Reason</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                const latestUpdate = getLatestStatusUpdate(request.requestId);
                const teaType =
                  request.teaType || latestUpdate?.teaType || "Not specified";
                const quantity =
                  request.quantity || latestUpdate?.quantity || 0;

                return (
                  <TableRow key={request.requestId}>
                    <TableCell className="font-medium">
                      {request.requestId}
                    </TableCell>
                    <TableCell>{request.machineId}</TableCell>
                    <TableCell>
                      {request.requestDateTime
                        ? formatDateTime(request.requestDateTime)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(request.requestStatus)}
                      >
                        {request.requestStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{teaType}</TableCell>
                    <TableCell>{quantity} units</TableCell>
                    <TableCell>
                      {request.assignRefillerName || "Not assigned"}
                    </TableCell>
                    <TableCell>
                      {request.acceptedAt
                        ? formatDateTime(request.acceptedAt)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {request.orderReady
                        ? formatDateTime(request.orderReady)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {request.completedAt
                        ? formatDateTime(request.completedAt)
                        : "N/A"}
                    </TableCell>
                    {showCancelReason && (
                      <TableCell>
                        {getCancelReason(request.requestId)}
                      </TableCell>
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
      )}
    </div>
  );
}
