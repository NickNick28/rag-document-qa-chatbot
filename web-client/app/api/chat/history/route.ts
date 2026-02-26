import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js"; // ใช้ตัวนี้สร้าง Admin Client

export const dynamic = "force-dynamic";

// Admin Client (Service Role) เพื่อทะลุ RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // 1. Check Auth
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. รับค่า botId
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("botId");

  // Logic สร้าง Session ID (ต้องตรงกับตอนบันทึก)
  const userEmail = session.user.email;
  const sessionId = `${userEmail}_${botId || "general"}`;

  // 3. Query ข้อมูล (⚠️ แก้ตรงนี้: ใช้ supabaseAdmin แทน supabase)
  // ผมเอา filter 24 ชม. ออกให้ก่อน เผื่อคุณอยากเห็นประวัติทั้งหมด
  const { data, error } = await supabaseAdmin
    .from("chat_history")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true }); // เรียงเก่า -> ใหม่

  if (error) {
    console.error("Fetch History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. ✅ ส่วนแปลง Data ให้ Frontend (Mapping)
  const formattedMessages = data.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.created_at, // ส่งไปให้ Frontend ใช้แสดงเวลา
  }));

  return NextResponse.json({ messages: formattedMessages });
}