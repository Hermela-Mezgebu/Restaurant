// src/app/admin/layout.tsx

import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />

      <main className="min-h-screen lg:pl-50">
        {children}
      </main>
    </div>
  );
}