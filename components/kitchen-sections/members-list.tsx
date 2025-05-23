import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, User } from "lucide-react";
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

interface MembersListProps {
  members: KitchenMember[];
}

// Safe date formatting function
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Not set";

  try {
    return format(new Date(dateString), "PPP");
  } catch (error) {
    console.error("Invalid date:", dateString);
    return "Invalid date";
  }
};

export function MembersList({ members }: MembersListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kitchen Team Members</CardTitle>
        <CardDescription>Staff members working in this kitchen</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member, index) => (
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
                      <User className="h-6 w-6 text-muted-foreground" />
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
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
  );
}
