import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSignIcon, MailIcon, PhoneIcon } from "lucide-react";

interface VendorsContentProps {
  vendors: any[];
}

export default function VendorsContent({ vendors }: VendorsContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Overview</CardTitle>
        <CardDescription>
          List of all onboarded vendors and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor._id}>
                <TableCell>{vendor.id}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage
                        src={`/placeholder.svg?text=${vendor.name.charAt(0)}`}
                        alt={vendor.name}
                      />
                      <AvatarFallback>{vendor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {vendor.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      vendor.status === "Active" ? "default" : "secondary"
                    }
                  >
                    {vendor.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <DollarSignIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                    ${vendor.amountDue.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>{vendor.lastOrder}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{vendor.contactPerson}</span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MailIcon className="h-3 w-3 mr-1" />
                      {vendor.email}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <PhoneIcon className="h-3 w-3 mr-1" />
                      {vendor.phone}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
