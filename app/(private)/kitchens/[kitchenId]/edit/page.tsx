"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ArrowLeft,
  Loader2,
  PlusIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  latitude: number;
  longitude: number;
  capacity: number;
  username: string;
  userId: string;
  password: string;
  members: KitchenMember[];
  status?: string;
}

// Add a safe date formatting function to handle invalid dates
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Not set";

  try {
    return format(new Date(dateString), "PPP");
  } catch (error) {
    console.error("Invalid date:", dateString);
    return "Invalid date";
  }
};

export default function EditKitchenPage() {
  const router = useRouter();
  const { kitchenId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(
    null
  );

  const [kitchen, setKitchen] = useState<Kitchen>({
    name: "",
    address: "",
    manager: "",
    managerMobile: "",
    latitude: 0,
    longitude: 0,
    capacity: 0,
    username: "",
    userId: "",
    password: "",
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

  const kitchens = useQuery(api.kitchens.list) || [];
  const editKitchen = useMutation(api.kitchens.edit);
  const generateUploadUrl = useMutation(api.kitchens.generateUploadUrl);

  useEffect(() => {
    // Find kitchen by userId instead of username
    const foundKitchen = kitchens.find((k) => k.userId === kitchenId);
    if (foundKitchen) {
      setKitchen(foundKitchen);
    }
  }, [kitchens, kitchenId]);

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
    if (!kitchen._id) {
      toast.error("Kitchen ID not found");
      return;
    }

    setIsLoading(true);
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
        latitude: Number(kitchen.latitude),
        longitude: Number(kitchen.longitude),
        capacity: Number(kitchen.capacity),
        username: kitchen.username,
        userId: kitchen.userId,
        password: kitchen.password,
        members: updatedMembers,
      };

      await editKitchen({ id: kitchen._id, ...kitchenData });
      toast.success("Kitchen updated successfully");
      router.push(`/kitchens/${kitchen.userId}`);
    } catch (error) {
      console.error("Error updating kitchen:", error);
      toast.error("Failed to update kitchen. Please try again.");
    } finally {
      setIsLoading(false);
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

  const handleEditMember = (editMember: KitchenMember, index: number) => {
    setMember(editMember);
    setEditingMemberIndex(index);
    setIsMemberDialogOpen(true);
  };

  const handleDeleteMember = (index: number) => {
    const updatedMembers = kitchen.members.filter((_, i) => i !== index);
    setKitchen((prev) => ({ ...prev, members: updatedMembers }));
  };

  if (!kitchen._id) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-medium">Loading kitchen data...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Kitchen: {kitchen.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  value={kitchen.latitude}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  value={kitchen.longitude}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={kitchen.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  name="userId"
                  value={kitchen.userId}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={kitchen.password}
                  onChange={handleInputChange}
                  placeholder="Leave empty to keep current password"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the current password
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kitchen Members</CardTitle>
            <Button type="button" onClick={() => setIsMemberDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </CardHeader>
          <CardContent>
            {kitchen.members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitchen.members.map((member, index) => (
                    <TableRow key={index}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.mobile}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.company}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMember(member, index)}
                          >
                            Edit
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
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No team members added yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>

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
                        formatDate(member.startingDate)
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
    </div>
  );
}
