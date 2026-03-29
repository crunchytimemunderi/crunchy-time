import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import NotificationContainer from "@/components/NotificationContainer";
import { createClient } from "@/utils/supabase/server";

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
    <html lang="en">
      <body className="antialiased">
        <AuthProvider initialUser={user}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <NotificationContainer />
            <main>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

