import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Users, ShieldCheck } from "lucide-react";
import UserManagementTable from "@/components/UserManagementTable";

// Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function UserManagementPage() {
  const session = await auth();

  // 1. Security Check
  if (!session) return redirect("/");
  const isAdmin = (session.user as any).role === "admin";
  if (!isAdmin) return redirect("/");

  // 2. Fetch Data (ดึงเฉพาะรายชื่อ User)
  const { data: usersList } = await supabaseAdmin
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
            <p className="text-slate-500 text-sm">
              จัดการสิทธิ์และรายชื่อผู้ใช้งานทั้งหมดในระบบ
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-slate-400" />
                    All Users ({usersList?.length || 0})
                </h2>
            </div>
            
            <div className="p-6">
                <UserManagementTable
                    users={usersList || []}
                    currentUserEmail={session.user.email}
                />
            </div>
        </div>
      </div>
    </div>
  );
}