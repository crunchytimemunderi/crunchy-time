import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import NotificationContainer from "@/components/NotificationContainer";

export const metadata: Metadata = {
  title: "CRUNCHY TIME - Fried Chicken Shop Management",
  description: "Manage your fried chicken shop sales, expenses, and cash reconciliation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <NotificationContainer />
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
