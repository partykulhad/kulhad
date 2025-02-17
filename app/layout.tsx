import type {Metadata} from "next";
import {Lora} from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@app/ConvexClientProvider";
import Header from "@/components/header";

const lora = Lora({
  subsets: ["latin"],
  // weight: "700",
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${lora.className}`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
