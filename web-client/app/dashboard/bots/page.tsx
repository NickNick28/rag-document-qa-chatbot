import { auth } from "@/app/lib/auth"; // ⚠️ เช็ค path ให้ตรงกับโปรเจกต์คุณ
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import BotManagementTable from "@/components/BotManagementTable"; // Component ที่เราทำเมื่อกี้
import { Wrench } from "lucide-react";

// Server Component: ดึงข้อมูลตรงจาก DB ได้เลย ไม่ต้องผ่าน API เพื่อความเร็ว
export default async function BotManagementPage() {
  // 1. ตรวจสอบสิทธิ์ (Security Check)
  const session = await auth();
  const userRole = (session?.user as any)?.role || "user";

  // ถ้าไม่ใช่ Admin ให้ดีดออกไปหน้าแรก หรือหน้า Login
  if (!session || userRole !== "admin") {
    redirect("/");
  }

  // 2. ดึงข้อมูล (Direct Database Access via Service Role)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: allBots, error } = await supabaseAdmin
    .from("bots")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bots:", error);
    return (
      <div className="p-6 text-red-500 bg-red-50 rounded-lg">
        เกิดข้อผิดพลาดในการดึงข้อมูล: {error.message}
      </div>
    );
  }

  // 3. แสดงผลหน้าเว็บ
  return (
    <div className="space-y-6 p-6">
      {/* Header ของหน้านี้ */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-800">
          <Wrench className="inline mr-2 text-orange-500" size={30}/> Bot Management
        </h1>
        <p className="text-slate-500 text-sm">
          จัดการบอททั้งหมดในระบบ ตรวจสอบสถานะ และลบบอทที่ไม่เหมาะสม
        </p>
      </div>

      {/* ตารางจัดการบอท */}
      <BotManagementTable bots={allBots || []} />
    </div>
  );
}
