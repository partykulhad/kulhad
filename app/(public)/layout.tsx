import type {Metadata} from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Kulhad",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100svh-4rem)] flex-col items-center bg-blue-50/40">
        {children}
      </main>
      {/* <main className="min-h-[calc(100svh-4rem)]">{children}</main> */}
    </>
  );
}
