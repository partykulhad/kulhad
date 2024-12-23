"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CalendarIcon, PlusIcon, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface KitchenMember {
  name: string;
  mobile: string;
  email: string;
  adhaar: string;
  address: string;
  uid: string;
  startingDate: string;
  company: string;
  pan: string;
  photoStorageId?: string;
  photo?: File | null;
}

interface Kitchen {
  _id?: Id<"kitchens">;
  name: string;
  address: string;
  manager: string;
  managerMobile: string;
  gis: string;
  capacity: number;
  members: KitchenMember[];
}

export default function AddKitchen() {
  const [kitchen, setKitchen] = useState<Kitchen>({
    name: "",
    address: "",
    manager: "",
    managerMobile: "",
    gis: "",
    capacity: 0,
    members: [],
  });
  const [member, setMember] = useState<KitchenMember>({
    name: "",
    mobile: "",
    email: "",
    adhaar: "",
    address: "",
    uid: "",
    startingDate: "",
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const addKitchen = useMutation(api.kitchens.add);
  const editKitchen = useMutation(api.kitchens.edit);
  const removeKitchen = useMutation(api.kitchens.remove);
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

  const handleDateSelect = (date: Date | undefined) => {
    setMember((prev) => ({
      ...prev,
      startingDate: date ? date.toISOString() : "",
    }));
    setIsCalendarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedMembers = await Promise.all(
        kitchen.members.map(async (member) => {
          if (member.photo instanceof File) {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": member.photo.type },
              body: member.photo,
            });
            const { storageId } = await result.json();
            return { ...member, photoStorageId: storageId, photo: undefined };
          }
          return { ...member, photo: undefined };
        })
      );

      const kitchenData = {
        name: kitchen.name,
        address: kitchen.address,
        manager: kitchen.manager,
        managerMobile: kitchen.managerMobile,
        gis: kitchen.gis,
        capacity: Number(kitchen.capacity),
        members: updatedMembers,
      };

      if (isEditing && kitchen._id) {
        await editKitchen({ id: kitchen._id, ...kitchenData });
        toast.success("Kitchen updated successfully");
      } else {
        await addKitchen(kitchenData);
        toast.success("Kitchen added successfully");
      }

      setKitchen({
        name: "",
        address: "",
        manager: "",
        managerMobile: "",
        gis: "",
        capacity: 0,
        members: [],
      });
      setIsDialogOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error adding/editing kitchen:", error);
      toast.error("Failed to add/edit kitchen. Please try again.");
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const newMember = {
        ...member,
        photoStorageId,
        photo: undefined,
      };

      if (editingMemberIndex !== null) {
        const updatedMembers = [...kitchen.members];
        updatedMembers[editingMemberIndex] = newMember;
        setKitchen((prev) => ({ ...prev, members: updatedMembers }));
      } else {
        setKitchen((prev) => ({
          ...prev,
          members: [...prev.members, newMember],
        }));
      }

      setMember({
        name: "",
        mobile: "",
        email: "",
        adhaar: "",
        address: "",
        uid: "",
        startingDate: "",
        company: "",
        pan: "",
        photo: null,
      });
      setIsMemberDialogOpen(false);
      setEditingMemberIndex(null);
    } catch (error) {
      console.error("Error adding/editing kitchen member:", error);
      toast.error("Failed to add/edit kitchen member. Please try again.");
    }
  };

  const handleEdit = (editKitchen: Kitchen) => {
    setKitchen(editKitchen);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: Id<"kitchens">) => {
    if (window.confirm("Are you sure you want to delete this kitchen?")) {
      try {
        await removeKitchen({ id });
        toast.success("Kitchen deleted successfully");
      } catch (error) {
        console.error("Error deleting kitchen:", error);
        toast.error("Failed to delete kitchen. Please try again.");
      }
    }
  };

  const handleEditMember = (editMember: KitchenMember, index: number) => {
    setMember(editMember);
    setEditingMemberIndex(index);
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = (index: number) => {
    const updatedMembers = kitchen.members.filter((_, i) => i !== index);
    setKitchen((prev) => ({ ...prev, members: updatedMembers }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchens</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setIsEditing(false);
              setKitchen({
                name: "",
                address: "",
                manager: "",
                managerMobile: "",
                gis: "",
                capacity: 0,
                members: [],
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add New Kitchen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Kitchen" : "Add New Kitchen"}
              </DialogTitle>
              <DialogDescription>
                Enter the details of the kitchen here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Kitchen Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={kitchen.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager">Manager</Label>
                  <Input
                    id="manager"
                    name="manager"
                    value={kitchen.manager}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerMobile">Manager Mobile</Label>
                  <Input
                    id="managerMobile"
                    name="managerMobile"
                    value={kitchen.managerMobile}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gis">GIS</Label>
                  <Input
                    id="gis"
                    name="gis"
                    value={kitchen.gis}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    value={kitchen.capacity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={kitchen.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kitchen Members</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Actions</TableHead>
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
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.mobile}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMember(member, index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMember(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  type="button"
                  onClick={() => setIsMemberDialogOpen(true)}
                >
                  Add Kitchen Member
                </Button>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {isEditing ? "Update" : "Add"} Kitchen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={isMemberDialogOpen}
        onOpenChange={(open) => {
          setIsMemberDialogOpen(open);
          if (!open) {
            setEditingMemberIndex(null);
            setMember({
              name: "",
              mobile: "",
              email: "",
              adhaar: "",
              address: "",
              uid: "",
              startingDate: "",
              company: "",
              pan: "",
              photo: null,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingMemberIndex !== null
                ? "Edit Kitchen Member"
                : "Add Kitchen Member"}
            </DialogTitle>
            <DialogDescription>
              Enter the details of the kitchen member here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">Name</Label>
                <Input
                  id="memberName"
                  name="name"
                  value={member.name}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberMobile">Mobile</Label>
                <Input
                  id="memberMobile"
                  name="mobile"
                  value={member.mobile}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberEmail">Email</Label>
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
                <Label htmlFor="memberAdhaar">Adhaar</Label>
                <Input
                  id="memberAdhaar"
                  name="adhaar"
                  value={member.adhaar}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberUid">UID</Label>
                <Input
                  id="memberUid"
                  name="uid"
                  value={member.uid}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberCompany">Company</Label>
                <Input
                  id="memberCompany"
                  name="company"
                  value={member.company}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberPan">PAN</Label>
                <Input
                  id="memberPan"
                  name="pan"
                  value={member.pan}
                  onChange={handleMemberInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memberStartingDate">Starting Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !member.startingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {member.startingDate ? (
                        format(new Date(member.startingDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        member.startingDate
                          ? new Date(member.startingDate)
                          : undefined
                      }
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
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
              <Label htmlFor="memberAddress">Address</Label>
              <Textarea
                id="memberAddress"
                name="address"
                value={member.address}
                onChange={handleMemberInputChange}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingMemberIndex !== null ? "Update" : "Add"} Kitchen Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kitchen Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Manager Mobile</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>GIS</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kitchens.map((kitchen) => (
              <TableRow key={kitchen._id}>
                <TableCell>{kitchen.name}</TableCell>
                <TableCell>{kitchen.manager}</TableCell>
                <TableCell>{kitchen.managerMobile}</TableCell>
                <TableCell>{kitchen.address}</TableCell>
                <TableCell>{kitchen.gis}</TableCell>
                <TableCell>{kitchen.capacity}</TableCell>
                <TableCell>{kitchen.members.length}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(kitchen)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(kitchen._id)}
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
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
        ...
      </div>
    );
  }

  if (photoUrl === null) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={name}
      className="w-10 h-10 rounded-full object-cover"
    />
  );
}
