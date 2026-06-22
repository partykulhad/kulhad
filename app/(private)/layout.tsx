"use client";

import type React from "react";
import { useEffect } from "react";

import { AuthLoading, Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loading } from "@/components/shared/loading";
import { api } from "@/convex/_generated/api";

function EmailGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const email = user?.primaryEmailAddress?.emailAddress || "";

  const isAllowed = useQuery(
    api.adminAuditLogs.isEmailAllowed,
    isLoaded && email ? { email } : "skip"
  );

  useEffect(() => {
    if (isLoaded && isAllowed === false) {
      router.push("/access-denied");
    }
  }, [isLoaded, isAllowed, router]);

  if (!isLoaded || isAllowed === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading />
      </div>
    );
  }

  if (isAllowed === false) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900 dark:to-teal-800">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />

      <AuthLoading>
        <div className="flex items-center justify-center h-screen">
          <Loading />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
            <SignInButton mode="modal" />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <EmailGuard>{children}</EmailGuard>
      </Authenticated>
    </div>
  );
}
