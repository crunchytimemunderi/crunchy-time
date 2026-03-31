import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import NotificationContainer from "@/components/NotificationContainer";
import MotionProvider from "@/components/MotionProvider";
import { createClient } from "@/utils/supabase/server";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRUNCHY TIME - Fried Chicken Shop Management",
  description: "Manage your fried chicken shop sales, expenses, and cash reconciliation",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body 
        className={cn(
          "min-h-screen bg-background font-inter antialiased",
          outfit.variable,
          inter.variable
        )}
        suppressHydrationWarning={true}
      >
        <AuthProvider initialUser={user}>
          <div className="relative flex min-h-screen flex-col" suppressHydrationWarning={true}>
            <Navbar />
            <NotificationContainer />
            <MotionProvider>
              <main className="flex-1">
                {children}
              </main>
            </MotionProvider>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
