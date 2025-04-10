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
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DeliveryAgent {
  _id?: Id<"deliveryAgents">;
  name: string;
  mobile: string;
  email: string;
  adhaar: string;
  address: string;
  uid: string;
  userId: string;
  startingDate: string;
  company: string;
  pan: string;
  photoStorageId?: string;
  photo?: File | null;
  username: string;
  password: string;
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

export default function EditDeliveryAgentPage() {
  const router = useRouter();
  const { agentId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [agent, setAgent] = useState<DeliveryAgent>({
    name: "",
    mobile: "",
    email: "",
    adhaar: "",
    address: "",
    uid: "",
    userId: "",
    startingDate: "",
    company: "",
    pan: "",
    photo: null,
    username: "",
    password: "",
  });

  const deliveryAgents = useQuery(api.deliveryAgents.list) || [];
  const editDeliveryAgent = useMutation(api.deliveryAgents.edit);
  const generateUploadUrl = useMutation(api.deliveryAgents.generateUploadUrl);

  useEffect(() => {
    // Find agent by userId instead of username
    const foundAgent = deliveryAgents.find((a) => a.userId === agentId);
    if (foundAgent) {
      setAgent({
        ...foundAgent,
        photo: null,
      });
    }
  }, [deliveryAgents, agentId]);

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
    if (!agent._id) {
      toast.error("Agent ID not found");
      return;
    }

    setIsLoading(true);
    try {
      let photoStorageId = agent.photoStorageId;

      if (agent.photo instanceof File) {
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
        userId: agent.userId,
        startingDate: agent.startingDate,
        company: agent.company,
        pan: agent.pan,
        photoStorageId,
        username: agent.username,
        password: agent.password || undefined, // Only update password if provided
      };

      await editDeliveryAgent({ id: agent._id, ...agentData });
      toast.success("Delivery agent updated successfully");
      router.push(`/delivery-agents/${agent.userId}`);
    } catch (error) {
      console.error("Error updating delivery agent:", error);
      toast.error("Failed to update delivery agent. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!agent._id) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-medium">Loading agent data...</h1>
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
        <h1 className="text-2xl font-bold">
          Edit Delivery Agent: {agent.name}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="startingDate">Starting Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !agent.startingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {agent.startingDate ? (
                        formatDate(agent.startingDate)
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        agent.startingDate
                          ? new Date(agent.startingDate)
                          : undefined
                      }
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  name="userId"
                  value={agent.userId}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  name="pan"
                  value={agent.pan}
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
                  placeholder="Leave empty to keep current password"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the current password
                </p>
              </div>
            </div>
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
    </div>
  );
}
