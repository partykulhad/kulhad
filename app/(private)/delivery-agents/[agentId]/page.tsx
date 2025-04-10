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
  Calendar,
  Phone,
  Mail,
  User,
  Truck,
  History,
  Loader2,
  Clock,
  FileText,
  Briefcase,
  CreditCard,
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

interface DeliveryAgent {
  _id: Id<"deliveryAgents">;
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
  username: string;
  password: string;
  status?: string;
}

// Define the request type
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
  kitchenUserId?: string;
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

export default function DeliveryAgentDetailsPage() {
  const router = useRouter();
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Get all delivery agents and find the one that matches the userId
  const deliveryAgents = useQuery(api.deliveryAgents.list) || [];
  const agent = deliveryAgents.find((a) => a.userId === agentId);

  // Get requests for this agent
  const requests =
    useQuery(
      api.requests.getByAgentUserId,
      agent ? { agentUserId: agent.userId } : { agentUserId: "" }
    ) || [];

  // Get completed deliveries for this agent
  const completedDeliveries =
    useQuery(
      api.requests.getCompletedByAgentUserId,
      agent ? { agentUserId: agent.userId } : { agentUserId: "" }
    ) || [];

  if (!agent) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Loading agent data...</h1>
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
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mr-4">
              {agent.photoStorageId ? (
                <img
                  src={`/api/photos/${agent.photoStorageId}`}
                  alt={agent.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{agent.name}</h1>
              <div className="flex items-center mt-1">
                <Badge
                  variant={agent.status === "active" ? "success" : "secondary"}
                  className="mr-2"
                >
                  {agent.status || "Active"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {agent.userId}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/delivery-agents/${agentId}/edit`)}
          >
            Edit Agent
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
        <TabsList className="grid grid-cols-3 md:grid-cols-3 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="history">Delivery History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-lg">{agent.name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Mobile</p>
                    <p className="text-lg">{agent.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-lg">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-lg">{agent.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-3 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Company</p>
                    <p className="text-lg">{agent.company}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Starting Date</p>
                    <p className="text-lg">{formatDate(agent.startingDate)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">UID</p>
                    <p className="text-lg">{agent.uid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Adhaar</p>
                    <p className="text-lg">{agent.adhaar}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-3 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">PAN</p>
                    <p className="text-lg">{agent.pan}</p>
                  </div>
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
                    {
                      requests.filter(
                        (r) =>
                          r.requestStatus === "pending" ||
                          r.requestStatus === "in-progress"
                      ).length
                    }
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
                  Completed Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <History className="h-5 w-5 mr-2 text-purple-500" />
                  <span className="text-2xl font-bold">
                    {completedDeliveries.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total completed deliveries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Login Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Username</p>
                    <p className="text-lg">{agent.username}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 mr-3" />
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-lg">••••••••</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Agent Address</CardTitle>
              <CardDescription>Full address details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Address
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p className="whitespace-pre-wrap">{agent.address}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Employment Information
                  </h3>
                  <div className="p-4 border rounded-md bg-muted/30">
                    <p>
                      <span className="font-medium">Company:</span>{" "}
                      {agent.company}
                    </p>
                    <p>
                      <span className="font-medium">Started:</span>{" "}
                      {formatDate(agent.startingDate)}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {agent.status || "Active"}
                    </p>
                  </div>
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

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>
                Current requests assigned to this delivery agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
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
                    This delivery agent has no active requests at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery History</CardTitle>
              <CardDescription>
                Past deliveries completed by this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedDeliveries.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Machine ID</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedDeliveries.map((delivery) => (
                        <TableRow key={delivery.requestId}>
                          <TableCell>{delivery.requestId}</TableCell>
                          <TableCell>{delivery.machineId}</TableCell>
                          <TableCell>
                            {new Date(
                              delivery.requestDateTime
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">Completed</Badge>
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
                    No Delivery History
                  </h3>
                  <p className="text-muted-foreground">
                    This delivery agent hasn't completed any deliveries yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Delivery agent performance statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Deliveries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {completedDeliveries.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      All time completed deliveries
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
                      Average delivery time
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
