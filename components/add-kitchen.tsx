"use client";
import type React from "react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Package,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Database schema interfaces - exactly matching the database
interface DatabaseKitchenMember {
  name: string;
  mobile: string;
  email: string;
  adhaar: string;
  address: string;
  uid?: string;
  startingDate: string;
  company: string;
  pan: string;
  photoStorageId?: string;
}

interface DatabaseKitchen {
  _id: Id<"kitchens">;
  _creationTime: number;
  name: string;
  address: string;
  manager: string;
  managerMobile: string;
  latitude: number;
  longitude: number;
  capacity: number;
  userId: string;
  username: string;
  password: string;
  salt: string;
  role: string;
  status?: string;
  members: DatabaseKitchenMember[];
}

interface DatabaseCanister {
  _id: Id<"canisters">;
  _creationTime: number;
  scanId: string;
  kitchenId: string;
  status: string;
  scanType: string;
  latitude: number;
  longitude: number;
  registrationDateTime: string;
  lastUpdated: string;
  isActive: boolean;
}

// Form interfaces for creating/editing
interface FormKitchenMember {
  name: string;
  mobile: string;
  email: string;
  adhaar: string;
  address: string;
  company: string;
  pan: string;
  photoStorageId?: string;
  photo?: File | null;
  uid?: string;
  startingDate?: string;
}

interface FormKitchen {
  _id?: Id<"kitchens">;
  name: string;
  address: string;
  manager: string;
  managerMobile: string;
  latitude: number;
  longitude: number;
  capacity: number;
  username: string;
  password: string;
  members: FormKitchenMember[];
}

interface FormCanister {
  _id?: Id<"canisters">;
  kitchenId: string;
  status: string;
  scanType: string;
  latitude: number;
  longitude: number;
}

export default function KitchenCanisterManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("kitchen");

  // Kitchen state
  const [kitchen, setKitchen] = useState<FormKitchen>({
    name: "",
    address: "",
    manager: "",
    managerMobile: "",
    latitude: 0,
    longitude: 0,
    capacity: 0,
    username: "",
    password: "",
    members: [],
  });

  const [member, setMember] = useState<FormKitchenMember>({
    name: "",
    mobile: "",
    email: "",
    adhaar: "",
    address: "",
    company: "",
    pan: "",
    photo: null,
  });

  // Canister state
  const [canister, setCanister] = useState<FormCanister>({
    kitchenId: "",
    status: "ready",
    scanType: "Scanner/Manual",
    latitude: 0,
    longitude: 0,
  });

  // Dialog states
  const [isKitchenDialogOpen, setIsKitchenDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isCanisterDialogOpen, setIsCanisterDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(
    null
  );

  // Loading states
  const [isSubmittingKitchen, setIsSubmittingKitchen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingCanister, setIsSubmittingCanister] = useState(false);
  const [isDeletingKitchen, setIsDeletingKitchen] = useState<string | null>(
    null
  );
  const [isDeletingCanister, setIsDeletingCanister] = useState<string | null>(
    null
  );

  // Kitchen mutations
  const addKitchen = useMutation(api.kitchens.add);
  const editKitchen = useMutation(api.kitchens.edit);
  const removeKitchen = useMutation(api.kitchens.remove);
  const addMember = useMutation(api.kitchens.addMember);
  const generateUploadUrl = useMutation(api.kitchens.generateUploadUrl);

  // Canister mutations
  const registerCanister = useMutation(api.canisters.registerCanister);
  const deactivateCanister = useMutation(api.canisters.deactivateCanister);

  // Queries
  const kitchens = useQuery(api.kitchens.list) || [];
  const canisters =
    useQuery(
      api.canisters.getAllCanisters,
      activeTab === "canister" ? {} : "skip"
    ) || [];

  // Kitchen handlers (keeping existing functionality)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setKitchen((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setMember((prev) => ({ ...prev, [name]: value }));
  };

  // Canister handlers
  const handleCanisterInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setCanister((prev) => ({
      ...prev,
      [name]:
        name === "latitude" || name === "longitude" ? Number(value) : value,
    }));
  };

  const handleCanisterSelectChange = (name: string, value: string) => {
    setCanister((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setMember((prev) => ({ ...prev, photo: file }));
      } else {
        toast.error("Please upload an image file (png, jpg, etc.)");
      }
    }
  };

  const resetKitchenForm = () => {
    setKitchen({
      name: "",
      address: "",
      manager: "",
      managerMobile: "",
      latitude: 0,
      longitude: 0,
      capacity: 0,
      username: "",
      password: "",
      members: [],
    });
    setIsEditing(false);
  };

  const resetMemberForm = () => {
    setMember({
      name: "",
      mobile: "",
      email: "",
      adhaar: "",
      address: "",
      company: "",
      pan: "",
      photo: null,
    });
    setEditingMemberIndex(null);
  };

  const resetCanisterForm = () => {
    setCanister({
      kitchenId: "",
      status: "ready",
      scanType: "Scanner/Manual",
      latitude: 0,
      longitude: 0,
    });
  };

  // Kitchen submit handler (keeping existing functionality)
  const handleKitchenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKitchen(true);
    try {
      if (isEditing && kitchen._id) {
        const processedMembers = await Promise.all(
          kitchen.members.map(async (member) => {
            let photoStorageId = member.photoStorageId;
            if (member.photo instanceof File) {
              const uploadUrl = await generateUploadUrl();
              const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": member.photo.type },
                body: member.photo,
              });
              const { storageId } = await result.json();
              photoStorageId = storageId;
            }
            return {
              name: member.name,
              mobile: member.mobile,
              email: member.email,
              adhaar: member.adhaar,
              address: member.address,
              company: member.company,
              pan: member.pan,
              photoStorageId,
              uid: member.uid!,
              startingDate: member.startingDate!,
            };
          })
        );

        const kitchenData = {
          id: kitchen._id,
          name: kitchen.name,
          address: kitchen.address,
          manager: kitchen.manager,
          managerMobile: kitchen.managerMobile,
          latitude: Number(kitchen.latitude),
          longitude: Number(kitchen.longitude),
          capacity: Number(kitchen.capacity),
          username: kitchen.username,
          password: kitchen.password || undefined,
          members: processedMembers,
        };
        await editKitchen(kitchenData);
        toast.success("Kitchen updated successfully");
      } else {
        const processedMembers = await Promise.all(
          kitchen.members.map(async (member) => {
            let photoStorageId = member.photoStorageId;
            if (member.photo instanceof File) {
              const uploadUrl = await generateUploadUrl();
              const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": member.photo.type },
                body: member.photo,
              });
              const { storageId } = await result.json();
              photoStorageId = storageId;
            }
            return {
              name: member.name,
              mobile: member.mobile,
              email: member.email,
              adhaar: member.adhaar,
              address: member.address,
              company: member.company,
              pan: member.pan,
              photoStorageId,
            };
          })
        );

        const kitchenData = {
          name: kitchen.name,
          address: kitchen.address,
          manager: kitchen.manager,
          managerMobile: kitchen.managerMobile,
          latitude: Number(kitchen.latitude),
          longitude: Number(kitchen.longitude),
          capacity: Number(kitchen.capacity),
          username: kitchen.username,
          password: kitchen.password,
          members: processedMembers,
        };
        await addKitchen(kitchenData);
        toast.success(
          "Kitchen added successfully with auto-generated UIDs and dates"
        );
      }
      resetKitchenForm();
      setIsKitchenDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding/editing kitchen:", error);
      toast.error(
        error.message || "Failed to add/edit kitchen. Please try again."
      );
    } finally {
      setIsSubmittingKitchen(false);
    }
  };

  // Canister submit handler
  const handleCanisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCanister(true);
    try {
      const result = await registerCanister({
        kitchenId: canister.kitchenId,
        status: canister.status,
        scanType: canister.scanType,
        latitude: canister.latitude,
        longitude: canister.longitude,
      });

      toast.success(
        `Canister registered successfully with ID: ${result.scanId}`
      );
      resetCanisterForm();
      setIsCanisterDialogOpen(false);
    } catch (error: any) {
      console.error("Error registering canister:", error);
      toast.error(
        error.message || "Failed to register canister. Please try again."
      );
    } finally {
      setIsSubmittingCanister(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMember(true);
    try {
      let photoStorageId = member.photoStorageId;
      if (member.photo instanceof File) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": member.photo.type },
          body: member.photo,
        });
        const { storageId } = await result.json();
        photoStorageId = storageId;
      }

      if (isEditing && kitchen._id && editingMemberIndex === null) {
        const memberData = {
          name: member.name,
          mobile: member.mobile,
          email: member.email,
          adhaar: member.adhaar,
          address: member.address,
          company: member.company,
          pan: member.pan,
          photoStorageId,
        };
        const newUID = await addMember({
          kitchenId: kitchen._id,
          member: memberData,
        });
        toast.success(`Kitchen member added successfully with UID: ${newUID}`);
        window.location.reload();
      } else {
        const newMember: FormKitchenMember = {
          name: member.name,
          mobile: member.mobile,
          email: member.email,
          adhaar: member.adhaar,
          address: member.address,
          company: member.company,
          pan: member.pan,
          photoStorageId,
          uid: member.uid,
          startingDate: member.startingDate,
        };

        if (editingMemberIndex !== null) {
          const updatedMembers = [...kitchen.members];
          updatedMembers[editingMemberIndex] = newMember;
          setKitchen((prev) => ({ ...prev, members: updatedMembers }));
          toast.success("Kitchen member updated successfully");
        } else {
          setKitchen((prev) => ({
            ...prev,
            members: [...prev.members, newMember],
          }));
          toast.success(
            "Kitchen member added to form (UID will be auto-generated when kitchen is saved)"
          );
        }
      }
      resetMemberForm();
      setIsMemberDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding/editing kitchen member:", error);
      toast.error(
        error.message || "Failed to add/edit kitchen member. Please try again."
      );
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleEdit = (editKitchen: any) => {
    setKitchen({
      _id: editKitchen._id,
      name: editKitchen.name,
      address: editKitchen.address,
      manager: editKitchen.manager,
      managerMobile: editKitchen.managerMobile,
      latitude: editKitchen.latitude,
      longitude: editKitchen.longitude,
      capacity: editKitchen.capacity,
      username: editKitchen.username,
      password: "",
      members: editKitchen.members.map((member: any) => ({
        ...member,
        photo: null,
        uid: member.uid || undefined,
      })),
    });
    setIsEditing(true);
    setIsKitchenDialogOpen(true);
  };

  const handleDelete = async (id: Id<"kitchens">) => {
    if (window.confirm("Are you sure you want to delete this kitchen?")) {
      setIsDeletingKitchen(id);
      try {
        await removeKitchen({ id });
        toast.success("Kitchen deleted successfully");
      } catch (error: any) {
        console.error("Error deleting kitchen:", error);
        toast.error(
          error.message || "Failed to delete kitchen. Please try again."
        );
      } finally {
        setIsDeletingKitchen(null);
      }
    }
  };

  const handleDeleteCanister = async (scanId: string) => {
    if (window.confirm("Are you sure you want to deactivate this canister?")) {
      setIsDeletingCanister(scanId);
      try {
        await deactivateCanister({ scanId });
        toast.success("Canister deactivated successfully");
      } catch (error: any) {
        console.error("Error deactivating canister:", error);
        toast.error(
          error.message || "Failed to deactivate canister. Please try again."
        );
      } finally {
        setIsDeletingCanister(null);
      }
    }
  };

  const handleEditMember = (editMember: any, index: number) => {
    setMember({
      ...editMember,
      photo: null,
      uid: editMember.uid || undefined,
    });
    setEditingMemberIndex(index);
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = (index: number) => {
    const updatedMembers = kitchen.members.filter((_, i) => i !== index);
    setKitchen((prev) => ({ ...prev, members: updatedMembers }));
    toast.success("Kitchen member removed");
  };

  const navigateToKitchenDetails = (kitchen: DatabaseKitchen) => {
    router.push(`/kitchens/${kitchen.userId}`);
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return "Auto-generated";
    return dateString;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
        return "default";
      case "in-use":
        return "secondary";
      case "maintenance":
        return "destructive";
      case "offline":
        return "outline";
      default:
        return "default";
    }
  };

  const getKitchenName = (kitchenId: string) => {
    const kitchen = kitchens.find((k) => k.userId === kitchenId);
    return kitchen ? kitchen.name : kitchenId;
  };

  return (
    <div className="container mx-auto p-2 sm:p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">
            Kitchen & Canister Management
          </h1>

          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="kitchen" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Kitchens
            </TabsTrigger>
            <TabsTrigger value="canister" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Canisters
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kitchen" className="space-y-6">
          {/* Kitchen Management Section */}
          <div className="flex justify-end">
            <Dialog
              open={isKitchenDialogOpen}
              onOpenChange={(open) => {
                setIsKitchenDialogOpen(open);
                if (!open) {
                  resetKitchenForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add New Kitchen
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? "Edit Kitchen" : "Add New Kitchen"}
                  </DialogTitle>
                  <DialogDescription>
                    Enter the details of the kitchen here. User ID and member
                    UIDs will be generated automatically.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(95vh-120px)] pr-4">
                  <form onSubmit={handleKitchenSubmit} className="space-y-6">
                    {/* Kitchen Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Kitchen Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={kitchen.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager">Manager *</Label>
                        <Input
                          id="manager"
                          name="manager"
                          value={kitchen.manager}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="managerMobile">Manager Mobile *</Label>
                        <Input
                          id="managerMobile"
                          name="managerMobile"
                          value={kitchen.managerMobile}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude *</Label>
                        <Input
                          id="latitude"
                          name="latitude"
                          type="number"
                          step="any"
                          value={kitchen.latitude}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude *</Label>
                        <Input
                          id="longitude"
                          name="longitude"
                          type="number"
                          step="any"
                          value={kitchen.longitude}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity *</Label>
                        <Input
                          id="capacity"
                          name="capacity"
                          type="number"
                          min="1"
                          value={kitchen.capacity}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          name="username"
                          value={kitchen.username}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">
                          Password {!isEditing && "*"}
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={kitchen.password}
                          onChange={handleInputChange}
                          required={!isEditing}
                          placeholder={
                            isEditing
                              ? "Leave blank to keep current password"
                              : ""
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={kitchen.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Kitchen Members Section */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <Label className="text-base font-semibold">
                          Kitchen Members ({kitchen.members.length})
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsMemberDialogOpen(true)}
                        >
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Add Member
                        </Button>
                      </div>

                      {kitchen.members.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Photo</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="hidden sm:table-cell">
                                    Mobile
                                  </TableHead>
                                  <TableHead className="hidden md:table-cell">
                                    Email
                                  </TableHead>
                                  <TableHead className="hidden lg:table-cell">
                                    UID
                                  </TableHead>
                                  <TableHead className="hidden xl:table-cell">
                                    Starting Date
                                  </TableHead>
                                  <TableHead className="w-24">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {kitchen.members.map((member, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <PhotoDisplay
                                        storageId={member.photoStorageId}
                                        name={member.name}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">
                                          {member.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground sm:hidden">
                                          {member.mobile}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                      {member.mobile}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                      {member.email}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                                      {member.uid || "Auto-generated"}
                                    </TableCell>
                                    <TableCell className="hidden xl:table-cell text-xs">
                                      {formatDisplayDate(member.startingDate)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex space-x-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleEditMember(
                                              member as DatabaseKitchenMember,
                                              index
                                            )
                                          }
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteMember(index)
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                          <p>No kitchen members added yet.</p>
                          <p className="text-sm">
                            Click "Add Member" to get started.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Info message about automatic fields */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> User ID and member UIDs (USER001,
                        USER002, etc.) will be automatically generated.
                        {!isEditing &&
                          " Starting dates for members will be set to the current date and time."}
                      </p>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsKitchenDialogOpen(false)}
                        className="w-full sm:w-auto"
                        disabled={isSubmittingKitchen}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={isSubmittingKitchen}
                      >
                        {isSubmittingKitchen ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditing ? "Updating..." : "Adding..."}
                          </>
                        ) : (
                          <>{isEditing ? "Update" : "Add"} Kitchen</>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          {/* Kitchens Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kitchen</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Manager
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Username
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      User ID
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Capacity
                    </TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitchens.map((kitchen) => (
                    <TableRow
                      key={kitchen._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToKitchenDetails(kitchen)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{kitchen.name}</div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {kitchen.manager}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {kitchen.username}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {kitchen.manager}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {kitchen.username}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">
                        {kitchen.userId}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {kitchen.capacity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {kitchen.members.length}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            members
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(kitchen);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(kitchen._id);
                            }}
                            disabled={isDeletingKitchen === kitchen._id}
                          >
                            {isDeletingKitchen === kitchen._id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToKitchenDetails(kitchen);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {kitchens.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No kitchens found.</p>
              <p className="text-sm">Click "Add New Kitchen" to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="canister" className="space-y-6">
          {/* Canister Management Section */}
          <div className="flex justify-end">
            <Dialog
              open={isCanisterDialogOpen}
              onOpenChange={(open) => {
                setIsCanisterDialogOpen(open);
                if (!open) {
                  resetCanisterForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add New Canister
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Add New Canister</DialogTitle>
                  <DialogDescription>
                    Enter the details of the canister here. Scan ID will be
                    generated automatically.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(95vh-120px)] pr-4">
                  <form onSubmit={handleCanisterSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="canisterKitchenId">Kitchen *</Label>
                        <Select
                          value={canister.kitchenId}
                          onValueChange={(value) =>
                            handleCanisterSelectChange("kitchenId", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a kitchen" />
                          </SelectTrigger>
                          <SelectContent>
                            {kitchens.map((kitchen) => (
                              <SelectItem
                                key={kitchen._id}
                                value={kitchen.userId}
                              >
                                {kitchen.name} ({kitchen.userId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="canisterStatus">Status *</Label>
                        <Select
                          value={canister.status}
                          onValueChange={(value) =>
                            handleCanisterSelectChange("status", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="in-use">In Use</SelectItem>
                            <SelectItem value="maintenance">
                              Maintenance
                            </SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="canisterScanType">Scan Type *</Label>
                        <Select
                          value={canister.scanType}
                          onValueChange={(value) =>
                            handleCanisterSelectChange("scanType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Scanner/Manual">
                              Scanner/Manual
                            </SelectItem>
                            <SelectItem value="QR Code">QR Code</SelectItem>
                            <SelectItem value="RFID">RFID</SelectItem>
                            <SelectItem value="NFC">NFC</SelectItem>
                            <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="canisterLatitude">Latitude *</Label>
                        <Input
                          id="canisterLatitude"
                          name="latitude"
                          type="number"
                          step="any"
                          value={canister.latitude}
                          onChange={handleCanisterInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="canisterLongitude">Longitude *</Label>
                        <Input
                          id="canisterLongitude"
                          name="longitude"
                          type="number"
                          step="any"
                          value={canister.longitude}
                          onChange={handleCanisterInputChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Info message */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>Note:</strong> Scan ID (KITCHEN_CAN_1,
                        KITCHEN_CAN_2, etc.) and registration date/time will be
                        automatically generated.
                      </p>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCanisterDialogOpen(false)}
                        className="w-full sm:w-auto"
                        disabled={isSubmittingCanister}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={isSubmittingCanister}
                      >
                        {isSubmittingCanister ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          <>Register Canister</>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          {/* Canisters Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scan ID</TableHead>
                    <TableHead>Kitchen</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Scan Type
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Location
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Registration Date
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Last Updated
                    </TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canisters.map((canister) => (
                    <TableRow key={canister._id}>
                      <TableCell>
                        <div>
                          <div className="font-mono font-medium">
                            {canister.scanId}
                          </div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            <Badge
                              variant={getStatusBadgeVariant(canister.status)}
                            >
                              {canister.status}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {getKitchenName(canister.kitchenId)}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {canister.kitchenId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={getStatusBadgeVariant(canister.status)}>
                          {canister.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {canister.scanType}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-xs font-mono">
                          <div>{canister.latitude.toFixed(5)}</div>
                          <div>{canister.longitude.toFixed(5)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs">
                        {canister.registrationDateTime}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs">
                        {canister.lastUpdated}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteCanister(canister.scanId)
                            }
                            disabled={isDeletingCanister === canister.scanId}
                          >
                            {isDeletingCanister === canister.scanId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {canisters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No canisters found.</p>
              <p className="text-sm">
                Click "Add New Canister" to get started.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Member Dialog */}
      <Dialog
        open={isMemberDialogOpen}
        onOpenChange={(open) => {
          setIsMemberDialogOpen(open);
          if (!open) {
            resetMemberForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingMemberIndex !== null
                ? "Edit Kitchen Member"
                : "Add Kitchen Member"}
            </DialogTitle>
            <DialogDescription>
              Enter the details of the kitchen member here. UID and starting
              date will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(95vh-120px)] pr-4">
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberName">Name *</Label>
                  <Input
                    id="memberName"
                    name="name"
                    value={member.name}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberMobile">Mobile *</Label>
                  <Input
                    id="memberMobile"
                    name="mobile"
                    value={member.mobile}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email *</Label>
                  <Input
                    id="memberEmail"
                    name="email"
                    type="email"
                    value={member.email}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberAdhaar">Adhaar *</Label>
                  <Input
                    id="memberAdhaar"
                    name="adhaar"
                    value={member.adhaar}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberCompany">Company *</Label>
                  <Input
                    id="memberCompany"
                    name="company"
                    value={member.company}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberPan">PAN *</Label>
                  <Input
                    id="memberPan"
                    name="pan"
                    value={member.pan}
                    onChange={handleMemberInputChange}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="memberPhoto">Photo</Label>
                  <Input
                    id="memberPhoto"
                    name="photo"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberAddress">Address *</Label>
                <Textarea
                  id="memberAddress"
                  name="address"
                  value={member.address}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>

              {/* Info message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> UID (USER001, USER002, etc.) and
                  starting date will be automatically generated when you add
                  this member.
                </p>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMemberDialogOpen(false)}
                  className="w-full sm:w-auto"
                  disabled={isSubmittingMember}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={isSubmittingMember}
                >
                  {isSubmittingMember ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingMemberIndex !== null
                        ? "Updating..."
                        : "Adding..."}
                    </>
                  ) : (
                    <>{editingMemberIndex !== null ? "Update" : "Add"} Member</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoDisplay({
  storageId,
  name,
}: {
  storageId?: string;
  name: string;
}) {
  const photoUrl = useQuery(
    api.kitchens.getPhotoUrl,
    storageId ? { storageId } : "skip"
  );

  if (photoUrl === undefined) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center">
        <div className="animate-pulse text-xs">...</div>
      </div>
    );
  }

  if (photoUrl === null || !photoUrl) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={photoUrl || "/placeholder.svg"}
      alt={name}
      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
    />
  );
}
