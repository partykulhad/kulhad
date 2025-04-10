"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Phone,
  Mail,
  User,
  Truck,
  History,
  Loader2,
  Building,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}

interface Kitchen {
  _id: Id<"kitchens">;
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

// Define the request type to match the actual structure from the database
interface Request {
  _id: Id<"requests">;
  _creationTime: number;
  requestId: string;
  machineId: string;
  requestDateTime: string;
  requestStatus: string;
  assignRefillerName?: string;
  agentUserId?: string | string[];
  agentId?: string;
  kitchenUserId?: string | string[];
  kitchenStatus?: string;
  agentStatus?: string;
  srcAddress?: string;
  destAddress?: string;
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

export default function KitchenDetailsPage() {
  const router = useRouter();
  const { kitchenId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Get all kitchens and find the one that matches the userId
  const kitchens = useQuery(api.kitchens.list) || [];
  const kitchen = kitchens.find((k) => k.userId === kitchenId);

  // Get requests for this kitchen
  const requests =
    useQuery(
      api.requests.getByKitchenUserId,
      kitchen ? { kitchenUserId: kitchen.userId } : { kitchenUserId: "" }
    ) || [];

  // Get active and completed requests
  const activeRequests = requests.filter(
    (r) => r.requestStatus !== "completed"
  );
  const completedRequests = requests.filter(
    (r) => r.requestStatus === "completed"
  );

  if (!kitchen) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Loading kitchen data...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{kitchen.name}</h1>
            <div className="flex items-center mt-1">
              <Badge
                variant={kitchen.status === "active" ? "success" : "secondary"}
                className="mr-2"
              >
                {kitchen.status || "Active"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {kitchen.userId}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/kitchens/${kitchenId}/edit`)}
          >
            Edit Kitchen
          </Button>
          <Button>Assign Request</Button>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Kitchen Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-lg">{kitchen.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Manager</p>
                    <p className="text-lg">{kitchen.manager}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-lg">{kitchen.managerMobile}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-lg">{kitchen.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-500" />
                  <span className="text-2xl font-bold">{kitchen.capacity}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum number of machines that can be serviced
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-2xl font-bold">
                    {kitchen.members.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Number of team members in this kitchen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-2">
                  <MapPin className="h-5 w-5 mr-2 text-red-500" />
                  <span className="text-lg font-medium">GPS Coordinates</span>
                </div>
                <div className="pl-7 space-y-1">
                  <p className="text-sm">Latitude: {kitchen.latitude}</p>
                  <p className="text-sm">Longitude: {kitchen.longitude}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {activeRequests.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Current pending and in-progress requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <History className="h-5 w-5 mr-2 text-purple-500" />
                  <span className="text-2xl font-bold">
                    {completedRequests.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total completed requests
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kitchen Address</CardTitle>
              <CardDescription>
                Full address and location details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Address
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="whitespace-pre-wrap">{kitchen.address}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    GPS Coordinates
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-500" />
                    <div>
                      <p>Latitude: {kitchen.latitude}</p>
                      <p>Longitude: {kitchen.longitude}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Map
                </h3>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Map view would be displayed here
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Team Members</CardTitle>
              <CardDescription>
                Staff members working in this kitchen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kitchen.members.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {kitchen.members.map((member, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="flex items-center p-4 border-b">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mr-4">
                          {member.photoStorageId ? (
                            <img
                              src={`/api/photos/${member.photoStorageId}`}
                              alt={member.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {member.company}
                          </p>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{member.mobile}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{member.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            Joined: {formatDate(member.startingDate)}
                          </span>
                        </div>
                      </div>
                      <CardFooter className="border-t bg-muted/30 px-4 py-2">
                        <Button variant="ghost" size="sm" className="ml-auto">
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Team Members</h3>
                  <p className="text-muted-foreground">
                    This kitchen doesn't have any team members yet.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full">Add New Team Member</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>
                Current requests assigned to this kitchen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery Agent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRequests.map((request) => (
                        <TableRow key={request.requestId}>
                          <TableCell>{request.requestId}</TableCell>
                          <TableCell>{request.machineId}</TableCell>
                          <TableCell>
                            {new Date(request.requestDateTime).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.requestStatus === "completed"
                                  ? "success"
                                  : request.requestStatus === "pending"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {request.requestStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.assignRefillerName || "Not assigned"}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Active Requests
                  </h3>
                  <p className="text-muted-foreground">
                    This kitchen has no active requests at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                Past requests completed by this kitchen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery Agent</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedRequests.map((request) => (
                        <TableRow key={request.requestId}>
                          <TableCell>{request.requestId}</TableCell>
                          <TableCell>{request.machineId}</TableCell>
                          <TableCell>
                            {new Date(request.requestDateTime).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">Completed</Badge>
                          </TableCell>
                          <TableCell>
                            {request.assignRefillerName || "Not assigned"}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Request History
                  </h3>
                  <p className="text-muted-foreground">
                    This kitchen hasn't completed any requests yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Kitchen performance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {completedRequests.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      All time completed requests
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">45 min</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Average fulfillment time
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rating
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">4.8/5</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on customer feedback
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
