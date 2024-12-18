import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { DialogFooter } from "@/components/ui/dialog";

export default function AddVendorContent() {
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const addVendor = useMutation(api.vendors.add);

  const handleVendorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addVendor(newVendor);
      console.log("New vendor added:", result);
      toast.success(
        `${newVendor.name} from ${newVendor.company} has been successfully added.`
      );
      setNewVendor({ name: "", email: "", phone: "", company: "" });
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Vendor</CardTitle>
        <CardDescription>Enter the details for the new vendor.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVendorSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorName" className="text-right">
                Name
              </Label>
              <Input
                id="vendorName"
                name="name"
                value={newVendor.name}
                onChange={handleVendorInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorEmail" className="text-right">
                Email
              </Label>
              <Input
                id="vendorEmail"
                name="email"
                type="email"
                value={newVendor.email}
                onChange={handleVendorInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorPhone" className="text-right">
                Phone
              </Label>
              <Input
                id="vendorPhone"
                name="phone"
                type="tel"
                value={newVendor.phone}
                onChange={handleVendorInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorCompany" className="text-right">
                Company
              </Label>
              <Input
                id="vendorCompany"
                name="company"
                value={newVendor.company}
                onChange={handleVendorInputChange}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Vendor</Button>
          </DialogFooter>
        </form>
      </CardContent>
    </Card>
  );
}
