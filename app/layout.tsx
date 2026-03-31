import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import NotificationContainer from "@/components/NotificationContainer";
import MotionProvider from "@/components/MotionProvider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Crunchy Time",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
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
            <PWAInstallPrompt />
          </div>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Crunchy Time" />
          <link rel="apple-touch-icon" href="/logo.png" />
          <link rel="apple-touch-startup-image" href="/logo.png" />
          <script dangerouslySetInnerHTML={{ __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            }
          `}} />
        </AuthProvider>
      </body>
    </html>
  );
}
