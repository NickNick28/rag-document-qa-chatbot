import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth"; // หรือ auth method ของคุณ

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botId } = await req.json();

  // ✅ สร้าง UUID ใหม่เป็น Token
  const newToken = crypto.randomUUID();

  // อัปเดตลง Database
  const { error } = await supabaseAdmin
    .from("bots")
    .update({ 
      share_token: newToken, 
      is_external: true, // บังคับเปิดแชร์ทันทีที่สร้างลิงก์ใหม่
      updated_at: new Date().toISOString() 
    })
    .eq("bot_id", botId)
    .eq("owner_id", session.user?.email); // เช็คความเป็นเจ้าของ

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, share_token: newToken });
}