import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building,
  User,
  Phone,
  MapPin,
  Users,
  Clock,
  History,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

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
  _id: any;
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

interface Request {
  _id: any;
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
  teaType?: string;
  quantity?: number;
  reason?: string;
}

interface KitchenStatsProps {
  kitchen: Kitchen;
  activeRequests: Request[];
  completedRequests: Request[];
  canceledRequests: Request[];
}

export function KitchenStats({
  kitchen,
  activeRequests,
  completedRequests,
  canceledRequests,
}: KitchenStatsProps) {
  return (
    <div className="space-y-6">
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
            <CardTitle className="text-sm font-medium">
              Team & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Team Size</p>
                <p className="text-lg">{kitchen.members.length} members</p>
              </div>
            </div>
            <div className="flex items-center">
              <Building className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">Capacity</p>
                <p className="text-lg">{kitchen.capacity} machines</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-3 text-red-500" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-lg">
                  {kitchen.latitude.toFixed(6)}, {kitchen.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Request Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-3 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-lg">
                  {
                    activeRequests.filter((r) => r.requestStatus === "Pending")
                      .length
                  }{" "}
                  requests
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Ready for Delivery</p>
                <p className="text-lg">
                  {
                    activeRequests.filter(
                      (r) => r.requestStatus === "OrderReady"
                    ).length
                  }{" "}
                  orders
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <History className="h-5 w-5 mr-3 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-lg">{completedRequests.length} requests</p>
              </div>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-3 text-red-500" />
              <div>
                <p className="text-sm font-medium">Canceled</p>
                <p className="text-lg">{canceledRequests.length} requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen Address</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
}
