"use client";

import React, { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, PlusIcon, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DeliveryAgent {
  _id?: Id<"deliveryAgents">;
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
  username: string;
  password: string;
}

export default function AddDeliveryAgent() {
  const [agent, setAgent] = useState<DeliveryAgent>({
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
    username: "",
    password: "",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const addDeliveryAgent = useMutation(api.deliveryAgents.add);
  const editDeliveryAgent = useMutation(api.deliveryAgents.edit);
  const removeDeliveryAgent = useMutation(api.deliveryAgents.remove);
  const generateUploadUrl = useMutation(api.deliveryAgents.generateUploadUrl);
  const deliveryAgents = useQuery(api.deliveryAgents.list) || [];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setAgent((prev) => ({ ...prev, photo: file }));
      } else {
        toast.error("Please upload an image file (png, jpg, etc.)");
      }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setAgent((prev) => ({
      ...prev,
      startingDate: date ? date.toISOString() : "",
    }));
    setIsCalendarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let photoStorageId = agent.photoStorageId;

      if (agent.photo) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": agent.photo.type },
          body: agent.photo,
        });
        const { storageId } = await result.json();
        photoStorageId = storageId;
      }

      const agentData = {
        name: agent.name,
        mobile: agent.mobile,
        email: agent.email,
        adhaar: agent.adhaar,
        address: agent.address,
        uid: agent.uid,
        startingDate: agent.startingDate,
        company: agent.company,
        pan: agent.pan,
        photoStorageId,
        username: agent.username,
        password: agent.password,
      };

      if (isEditing && agent._id) {
        await editDeliveryAgent({ id: agent._id, ...agentData });
        toast.success("Delivery agent updated successfully");
      } else {
        await addDeliveryAgent(agentData);
        toast.success("Delivery agent added successfully");
      }

      setAgent({
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
        username: "",
        password: "",
      });
      setIsDialogOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error adding/editing delivery agent:", error);
      toast.error("Failed to add/edit delivery agent. Please try again.");
    }
  };

  const handleEdit = (editAgent: DeliveryAgent) => {
    setAgent({
      ...editAgent,
      photo: null,
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: Id<"deliveryAgents">) => {
    if (
      window.confirm("Are you sure you want to delete this delivery agent?")
    ) {
      try {
        await removeDeliveryAgent({ id });
        toast.success("Delivery agent deleted successfully");
      } catch (error) {
        console.error("Error deleting delivery agent:", error);
        toast.error("Failed to delete delivery agent. Please try again.");
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Delivery Agents</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setIsEditing(false);
              setAgent({
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
                username: "",
                password: "",
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add New Delivery Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Delivery Agent" : "Add New Delivery Agent"}
              </DialogTitle>
              <DialogDescription>
                Enter the details of the delivery agent here.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={agent.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={agent.mobile}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={agent.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adhaar">Adhaar</Label>
                  <Input
                    id="adhaar"
                    name="adhaar"
                    value={agent.adhaar}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uid">UID</Label>
                  <Input
                    id="uid"
                    name="uid"
                    value={agent.uid}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={agent.company}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    name="pan"
                    value={agent.pan}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Photo</Label>
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={agent.username}
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
                    value={agent.password}
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
                  value={agent.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {isEditing ? "Update" : "Add"} Delivery Agent
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryAgents.map((agent) => (
              <TableRow key={agent._id}>
                <TableCell>
                  <PhotoDisplay
                    storageId={agent.photoStorageId}
                    name={agent.name}
                  />
                </TableCell>
                <TableCell>{agent.name}</TableCell>
                <TableCell>{agent.mobile}</TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>{agent.address}</TableCell>
                <TableCell>{agent.uid}</TableCell>
                <TableCell>{agent.username}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(agent)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(agent._id)}
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
    api.deliveryAgents.getPhotoUrl,
    storageId ? { storageId } : "skip"
  );

  if (photoUrl === undefined) {
    return <div>Loading...</div>;
  }

  if (photoUrl === null) {
    return <div>No photo</div>;
  }

  return (
    <img
      src={photoUrl}
      alt={name}
      className="w-10 h-10 rounded-full object-cover"
    />
  );
}
