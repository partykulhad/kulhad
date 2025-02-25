"use client";

import type React from "react";

import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Loading } from "@/components/shared/loading";

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

      <Authenticated>{children}</Authenticated>
    </div>
  );
}
