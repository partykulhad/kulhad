"use client";

import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Loading } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo";

const Header = () => {
  return (
    <header
      className={cn(
        "w-full border-b bottom-2 border-border/40 z-50 sticky top-0",
        "bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <nav className="lg:px-20 px-5 py-3 mx-auto">
        <div className="flex items-center justify-between w-full">
          {/* Left: Logo */}
          <Logo />

          {/* Right: Auth + Dashboard */}
          <div className="flex gap-4 items-center">
            <Authenticated>
              <Link
                href="/dashboard"
                className={cn(
                  "relative inline-flex items-center justify-center px-5 py-2 rounded-lg font-semibold text-white uppercase text-sm tracking-wide",
                  "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500",
                  "bg-[length:200%_200%] animate-gradientMove",
                  "shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out hover:scale-105"
                )}
              >
                Dashboard
                <span className="absolute -inset-1 z-[-1] rounded-lg blur-md opacity-60 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-pulse"></span>
              </Link>
            </Authenticated>

            <AuthLoading>
              <Loading />
            </AuthLoading>

            <Unauthenticated>
              <SignInButton mode="modal" />
            </Unauthenticated>

            <Authenticated>
              <UserButton />
            </Authenticated>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
