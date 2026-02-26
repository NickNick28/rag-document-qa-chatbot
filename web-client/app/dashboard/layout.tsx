import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) return redirect("/");

  return (
    // ✅ 1. ล็อคความสูงหน้าจอ (h-screen) และซ่อน Scrollbar ของ Body (overflow-hidden)
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      {/* Sidebar: จะสูงเต็มจอตาม Parent */}
      <AdminSidebar user={session.user} />

      {/* ✅ 2. Main Content: ให้ขยายเต็มพื้นที่ (flex-1) และ Scroll เฉพาะในนี้ (overflow-y-auto) */}
      <main className="flex-1 flex flex-col w-full h-full overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}