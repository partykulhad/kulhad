"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ReceiptIcon,
  DownloadIcon,
  CalendarIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = ["all", "paid", "active", "expired", "closed"];

function statusBadgeVariant(status: string): "success" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "paid":
      return "success";
    case "active":
      return "outline";
    case "expired":
    case "closed":
      return "secondary";
    default:
      return "secondary";
  }
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function TransactionsPage() {
  const transactions = useQuery(api.transactions.list) || [];
  const machines = useQuery(api.machines.list) || [];

  const [machineFilter, setMachineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(0);

  const machineNameById = useMemo(() => {
    const map = new Map<string, string>();
    machines.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [machines]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (machineFilter !== "all" && t.machineId !== machineFilter) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (dateRange?.from && t.createdAt < dateRange.from.getTime()) return false;
        if (
          dateRange?.to &&
          t.createdAt > dateRange.to.getTime() + 24 * 60 * 60 * 1000 - 1
        )
          return false;
        if (
          term &&
          !t.transactionId.toLowerCase().includes(term) &&
          !(t.customTransactionId || "").toLowerCase().includes(term)
        )
          return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, machineFilter, statusFilter, search, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const totals = useMemo(() => {
    const paid = filtered.filter((t) => t.status === "paid");
    return {
      count: filtered.length,
      cups: paid.reduce((sum, t) => sum + t.cups, 0),
      revenue: paid.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [filtered]);

  const handleExport = () => {
    const rows = filtered.map((t) => ({
      transactionId: t.transactionId,
      customTransactionId: t.customTransactionId || "",
      machine: machineNameById.get(t.machineId) || t.machineId,
      machineId: t.machineId,
      date: new Date(t.createdAt).toISOString(),
      cups: t.cups,
      amount: t.amount,
      amountPerCup: t.amountPerCup,
      status: t.status,
      paymentId: t.paymentId || "",
      failureReason: t.failureReason || "",
    }));
    downloadCsv(rows, `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/20 via-blue-50/10 to-purple-50/20 dark:from-cyan-900/5 dark:via-blue-900/3 dark:to-purple-900/5" />

      <CardHeader className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg">
              <ReceiptIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black bg-gradient-to-r from-gray-900 via-cyan-800 to-blue-800 dark:from-gray-100 dark:via-cyan-200 dark:to-blue-200 bg-clip-text text-transparent">
                All Transactions
              </CardTitle>
              <CardDescription>
                {totals.count.toLocaleString("en-IN")} transactions ·{" "}
                {totals.cups.toLocaleString("en-IN")} cups (paid) · ₹
                {totals.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} revenue (paid)
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="h-11 rounded-2xl font-semibold"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transaction ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 w-[220px] rounded-2xl"
            />
          </div>

          <Select
            value={machineFilter}
            onValueChange={(v) => {
              setMachineFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[180px] rounded-2xl">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[150px] rounded-2xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-2xl font-medium">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd")} -{" "}
                      {format(dateRange.to, "MMM dd")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, y")
                  )
                ) : (
                  <span>All dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setPage(0);
                }}
                numberOfMonths={2}
              />
              {dateRange && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDateRange(undefined);
                      setPage(0);
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {pageRows.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 font-semibold">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Machine</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Cups</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount (₹)</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                    >
                      <td className="py-3 px-4 font-mono text-xs">{t.transactionId}</td>
                      <td className="py-3 px-4">
                        {machineNameById.get(t.machineId) || t.machineId}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">{t.cups}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹{t.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant(t.status)}>{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page + 1} of {totalPages} ({filtered.length.toLocaleString("en-IN")} results)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
