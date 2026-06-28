"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress || "Unknown Email";
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <ShieldX className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          Your account (<b>{currentEmail}</b>) does not have permission to access the Kulhad dashboard.
          Please contact your administrator to request access.
        </p>
        <SignOutButton>
          <Button variant="destructive" className="w-full">
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
