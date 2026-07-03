"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Plus,
  Trash2,
  Pencil,
  Wallet,
  Wrench,
  ShieldCheck,
  Ban,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RFIDTag = {
  _id: Id<"rfidTags">;
  cardId: string;
  label: string;
  role: string;
  balance: number;
  isActive: boolean;
  allowedMachines?: string[];
  maintenanceAction?: string;
  maintenanceDuration?: number;
  maintenanceMessage?: string;
  createdAt: number;
  lastUsedAt?: number;
  createdBy?: string;
};

const EMPTY_FORM = {
  cardId: "",
  label: "",
  role: "dispensing",
  balance: 10,
  isActive: true,
  allowedMachines: "",
  maintenanceAction: "solenoid_open",
  maintenanceDuration: 10,
  maintenanceMessage: "Maintenance mode activated",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RFIDManagement() {
  const tags = (useQuery(api.rfidTags.list) ?? []) as RFIDTag[];
  const machines = useQuery(api.machines.list) ?? [];

  const addTag = useMutation(api.rfidTags.add);
  const updateTag = useMutation(api.rfidTags.update);
  const removeTag = useMutation(api.rfidTags.remove);
  const toggleActive = useMutation(api.rfidTags.toggleActive);
  const adjustBalance = useMutation(api.rfidTags.adjustBalance);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "dispensing" | "maintenance">("all");

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RFIDTag | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<RFIDTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Top-up / deduct dialog
  const [balanceTarget, setBalanceTarget] = useState<RFIDTag | null>(null);
  const [balanceDelta, setBalanceDelta] = useState("5");

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = tags.filter((t) => {
    const matchSearch =
      t.cardId.toLowerCase().includes(search.toLowerCase()) ||
      t.label.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Open add dialog ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  // ── Open edit dialog ─────────────────────────────────────────────────────────
  const openEdit = (tag: RFIDTag) => {
    setEditTarget(tag);
    setForm({
      cardId: tag.cardId,
      label: tag.label,
      role: tag.role,
      balance: tag.balance,
      isActive: tag.isActive,
      allowedMachines: (tag.allowedMachines ?? []).join(", "),
      maintenanceAction: tag.maintenanceAction ?? "solenoid_open",
      maintenanceDuration: tag.maintenanceDuration ?? 10,
      maintenanceMessage: tag.maintenanceMessage ?? "Maintenance mode activated",
    });
    setDialogOpen(true);
  };

  // ── Save (add or edit) ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.cardId.trim() || !form.label.trim()) {
      toast.error("Card ID and label are required");
      return;
    }
    setSaving(true);
    try {
      const allowedMachines = form.allowedMachines
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (editTarget) {
        await updateTag({
          id: editTarget._id,
          label: form.label,
          role: form.role,
          balance: Number(form.balance),
          isActive: form.isActive,
          allowedMachines: allowedMachines.length ? allowedMachines : undefined,
          maintenanceAction: form.role === "maintenance" ? form.maintenanceAction : undefined,
          maintenanceDuration: form.role === "maintenance" ? Number(form.maintenanceDuration) : undefined,
          maintenanceMessage: form.role === "maintenance" ? form.maintenanceMessage : undefined,
        });
        toast.success("Tag updated");
      } else {
        await addTag({
          cardId: form.cardId.toUpperCase().trim(),
          label: form.label,
          role: form.role,
          balance: Number(form.balance),
          isActive: form.isActive,
          allowedMachines: allowedMachines.length ? allowedMachines : undefined,
          maintenanceAction: form.role === "maintenance" ? form.maintenanceAction : undefined,
          maintenanceDuration: form.role === "maintenance" ? Number(form.maintenanceDuration) : undefined,
          maintenanceMessage: form.role === "maintenance" ? form.maintenanceMessage : undefined,
        });
        toast.success("Tag registered");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeTag({ id: deleteTarget._id });
      toast.success("Tag removed");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to remove tag");
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────────
  const handleToggle = async (tag: RFIDTag) => {
    try {
      await toggleActive({ id: tag._id });
      toast.success(tag.isActive ? "Card deactivated" : "Card activated");
    } catch {
      toast.error("Failed to toggle card");
    }
  };

  // ── Balance adjust ────────────────────────────────────────────────────────────
  const handleBalanceAdjust = async (sign: 1 | -1) => {
    if (!balanceTarget) return;
    const delta = sign * Math.abs(Number(balanceDelta));
    if (!delta) { toast.error("Enter a valid amount"); return; }
    try {
      const { balance } = await adjustBalance({ id: balanceTarget._id, delta });
      toast.success(`Balance updated → ${balance} cups`);
      setBalanceTarget(null);
    } catch {
      toast.error("Failed to adjust balance");
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalActive = tags.filter((t) => t.isActive).length;
  const totalDispensing = tags.filter((t) => t.role === "dispensing").length;
  const totalMaintenance = tags.filter((t) => t.role === "maintenance").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 shadow-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              RFID Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage tap-to-pay and maintenance cards
            </p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/40">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Cards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalActive}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dispensing</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalDispensing}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMaintenance}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-md border-0">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by card ID or label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="dispensing">Dispensing</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tags Table */}
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b">
          <CardTitle className="text-base font-semibold">Registered Cards</CardTitle>
          <CardDescription>{filtered.length} card{filtered.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CreditCard className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No cards found</p>
              <p className="text-sm">Add a card to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                    <TableHead>Card ID</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Machines</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tag) => (
                    <TableRow key={tag._id} className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors">
                      <TableCell>
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {tag.cardId}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{tag.label}</TableCell>
                      <TableCell>
                        {tag.role === "dispensing" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                            <Wallet className="h-3 w-3 mr-1" />
                            Dispensing
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                            <Wrench className="h-3 w-3 mr-1" />
                            Maintenance
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tag.role === "dispensing" ? (
                          <button
                            onClick={() => { setBalanceTarget(tag); setBalanceDelta("5"); }}
                            className="inline-flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            {tag.balance} cups
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tag.allowedMachines && tag.allowedMachines.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tag.allowedMachines.map((m) => (
                              <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">All machines</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {tag.lastUsedAt
                          ? new Date(tag.lastUsedAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={tag.isActive}
                          onCheckedChange={() => handleToggle(tag)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-violet-600"
                            onClick={() => openEdit(tag)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-red-600"
                            onClick={() => setDeleteTarget(tag)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Card" : "Register New Card"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Update card settings" : "Add an RFID card to the Kulhad registry"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Card ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Card ID (Hex UID)</label>
              <Input
                placeholder="e.g. A3F20B1C"
                value={form.cardId}
                onChange={(e) => setForm({ ...form, cardId: e.target.value.toUpperCase() })}
                disabled={!!editTarget}
                className="font-mono uppercase"
              />
              {!editTarget && (
                <p className="text-xs text-gray-400">
                  Tap the card once on the reader — the UID appears in the kiosk logs, or scan with NFC Tools.
                </p>
              )}
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Label / Name</label>
              <Input
                placeholder="e.g. John's card"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispensing">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-emerald-500" />
                      Dispensing — deduct 1 cup per tap
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-500" />
                      Maintenance — open solenoid / unlock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Balance (dispensing only) */}
            {form.role === "dispensing" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Initial Balance (cups)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                />
              </div>
            )}

            {/* Maintenance fields */}
            {form.role === "maintenance" && (
              <div className="space-y-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Maintenance Settings</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Action</label>
                  <Select value={form.maintenanceAction} onValueChange={(v) => setForm({ ...form, maintenanceAction: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solenoid_open">Open Solenoid Valve</SelectItem>
                      <SelectItem value="flush">Trigger Flush</SelectItem>
                      <SelectItem value="unlock">Unlock Machine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (seconds)</label>
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    value={form.maintenanceDuration}
                    onChange={(e) => setForm({ ...form, maintenanceDuration: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message shown on kiosk</label>
                  <Input
                    value={form.maintenanceMessage}
                    onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Allowed machines */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Allowed Machines <span className="text-gray-400 font-normal">(optional)</span></label>
              <Input
                placeholder="e.g. UKL_BLR_001, UKL_BLR_002 — leave blank for all"
                value={form.allowedMachines}
                onChange={(e) => setForm({ ...form, allowedMachines: e.target.value })}
              />
              <p className="text-xs text-gray-400">Comma-separated machine IDs. Leave empty to allow all machines.</p>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
            >
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editTarget ? "Save Changes" : "Register Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Card</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">{deleteTarget?.label}</span> (
              <code className="font-mono text-sm">{deleteTarget?.cardId}</code>).
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Balance Adjust Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!balanceTarget} onOpenChange={() => setBalanceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{balanceTarget?.label}</span> —
              current balance: <span className="font-bold text-violet-600">{balanceTarget?.balance} cups</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-sm font-medium">Amount (cups)</label>
            <Input
              type="number"
              min={1}
              value={balanceDelta}
              onChange={(e) => setBalanceDelta(e.target.value)}
              className="text-center text-lg font-bold"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBalanceTarget(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => handleBalanceAdjust(-1)}
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              Deduct
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              onClick={() => handleBalanceAdjust(1)}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
