"use client";

import {AuthLoading, Authenticated, Unauthenticated} from "convex/react";
import {SignInButton, UserButton} from "@clerk/nextjs";

import {Loading} from "@/components/shared/loading";
import {cn} from "@/lib/utils";
import Logo from "@/components/logo";
import {NAV_LINKS} from "@/lib/constants";
import Link from "next/link";
const Header = () => {
  return (
    <header
      className={cn(
        "w-full border-b bottom-2 border-border/40 z-50 sticky top-0",
        "bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <nav className="lg:px-20 px-5 py-3 mx-auto">
        <div className="flex justify-evenly w-full">
          <Logo />
          <div className="flex items-center justify-center">
            <ul className="flex gap-8 items-center text-sm">
              {NAV_LINKS.map((link) => (
                <li
                  key={link.id}
                  className="hover:underline hover:scale-105 hover:underline-offset-4 cursor-pointer duration-75 transition-all ease-linear"
                >
                  <Link
                    className="text-amber-950 hover:text-amber-900 font-semibold text-base"
                    href={`/#${link.id}`}
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
              <Authenticated>
                <li className="hover:underline hover:scale-105 hover:underline-offset-4 cursor-pointer duration-75 transition-all ease-linear">
                  <Link
                    href="dashboard"
                    className="text-amber-950 hover:text-amber-900 font-semibold text-base"
                  >
                    Dashboard
                  </Link>
                </li>
              </Authenticated>
            </ul>
          </div>

          <div className="flex gap-4 justify-end items-center flex-1">
            <AuthLoading>
              <Loading />
            </AuthLoading>
            <Unauthenticated>
              <SignInButton mode="modal" />
            </Unauthenticated>
            <Authenticated>
              <div className="flex justify-center items-center">
                <UserButton />
              </div>
            </Authenticated>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
