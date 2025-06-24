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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// Database schema interfaces - exactly matching the database
interface DatabaseKitchenMember {
  name: string;
  mobile: string;
  email: string;
  adhaar: string;
  address: string;
  uid?: string; // Optional in database (can be undefined from query)
  startingDate: string; // Required in database
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
  members: DatabaseKitchenMember[]; // Members can have optional uid from database
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
  uid?: string; // Optional in form (auto-generated)
  startingDate?: string; // Optional in form (auto-generated)
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

export default function AddKitchen() {
  const router = useRouter();
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(
    null
  );

  // Loading states
  const [isSubmittingKitchen, setIsSubmittingKitchen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isDeletingKitchen, setIsDeletingKitchen] = useState<string | null>(
    null
  );

  const addKitchen = useMutation(api.kitchens.add);
  const editKitchen = useMutation(api.kitchens.edit);
  const removeKitchen = useMutation(api.kitchens.remove);
  const addMember = useMutation(api.kitchens.addMember);
  const generateUploadUrl = useMutation(api.kitchens.generateUploadUrl);
  const kitchens = useQuery(api.kitchens.list) || [];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKitchen(true);

    try {
      if (isEditing && kitchen._id) {
        // For editing, process members with existing uid and startingDate
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

            // For editing, uid and startingDate must be present
            return {
              name: member.name,
              mobile: member.mobile,
              email: member.email,
              adhaar: member.adhaar,
              address: member.address,
              company: member.company,
              pan: member.pan,
              photoStorageId,
              uid: member.uid!, // Must exist for editing
              startingDate: member.startingDate!, // Must exist for editing
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
        // For adding, process members without uid and startingDate (will be auto-generated)
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

            // For adding, don't include uid and startingDate (will be auto-generated)
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
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding/editing kitchen:", error);
      toast.error(
        error.message || "Failed to add/edit kitchen. Please try again."
      );
    } finally {
      setIsSubmittingKitchen(false);
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
        // Adding new member to existing kitchen - use addMember mutation
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

        // Refresh the kitchen data by refetching
        window.location.reload(); // Simple refresh to get updated data
      } else {
        // Adding/editing member in form (not yet saved to database)
        const newMember: FormKitchenMember = {
          name: member.name,
          mobile: member.mobile,
          email: member.email,
          adhaar: member.adhaar,
          address: member.address,
          company: member.company,
          pan: member.pan,
          photoStorageId,
          uid: member.uid, // Preserve existing UID if editing
          startingDate: member.startingDate, // Preserve existing startingDate if editing
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
    // Use any to avoid type conflicts
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
      password: "", // Don't pre-fill password for security
      members: editKitchen.members.map((member: any) => ({
        ...member,
        photo: null, // Don't pre-fill photo
        uid: member.uid || undefined, // Handle optional uid
      })),
    });
    setIsEditing(true);
    setIsDialogOpen(true);
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

  const handleEditMember = (editMember: any, index: number) => {
    // Use any to avoid type conflicts
    setMember({
      ...editMember,
      photo: null, // Don't pre-fill photo
      uid: editMember.uid || undefined, // Handle optional uid
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
    return dateString; // Since it's already formatted from the backend
  };

  return (
    <div className="container mx-auto p-2 sm:p-4">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Kitchens</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
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
                Enter the details of the kitchen here. User ID and member UIDs
                will be generated automatically.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(95vh-120px)] pr-4">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                        isEditing ? "Leave blank to keep current password" : ""
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
                              <TableHead className="w-24">Actions</TableHead>
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
                                      onClick={() => handleDeleteMember(index)}
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
                    onClick={() => setIsDialogOpen(false)}
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

      {/* Kitchens Table - Responsive */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kitchen</TableHead>
                <TableHead className="hidden sm:table-cell">Manager</TableHead>
                <TableHead className="hidden md:table-cell">Username</TableHead>
                <TableHead className="hidden lg:table-cell">User ID</TableHead>
                <TableHead className="hidden xl:table-cell">Capacity</TableHead>
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
