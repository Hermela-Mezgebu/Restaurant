"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Staff has its own completely separate layout/navigation.
  const isStaffPage = pathname === "/staff" || pathname.startsWith("/staff/");

  // Admin can also have its own layout if you have one.
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");

  const isPrivateWorkspace = isStaffPage || isAdminPage;

  return (
    <div className="min-h-screen">
      {!isPrivateWorkspace && <Navbar />}

      <main>{children}</main>

      {!isPrivateWorkspace && <Footer />}
    </div>
  );
}