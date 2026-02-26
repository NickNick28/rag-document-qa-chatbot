import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  // ✅ ต้องมั่นใจว่าชื่อตรงนี้ (botId) ตรงกับชื่อโฟลเดอร์ [botId] เป๊ะๆ
  { params }: { params: Promise<{ botId: string }> } 
) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ ดึงค่าจาก params และ Log ดู
    const { botId } = await params;

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is missing" }, { status: 400 });
    }

    // ✅ Query ข้อมูล
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("id, filename, created_at, bot_id") // เลือก bot_id มาดูด้วย
      .eq("bot_id", botId) // <--- จุดสำคัญ: ต้องมีบรรทัดนี้เพื่อกรองเฉพาะบอทตัวนั้น
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database Error:", error);
      throw error;
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}