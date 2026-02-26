// app/api/debug/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic"; // ห้าม Cache เด็ดขาด

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("botId");

  if (!botId) return NextResponse.json({ msg: "No Bot ID" });

  // 1. ลองดึงแบบไม่สน is_external
  const { data: rawBot, error: rawError } = await supabaseAdmin
    .from("bots")
    .select("*") // ดึงมาทุกคอลัมน์เลย
    .eq("bot_id", botId)
    .single();

  return NextResponse.json({
    status: "Debug Report",
    check_id: botId,
    found_in_db: !!rawBot,
    is_external_value: rawBot?.is_external, // ดูค่านี้ให้ดีๆ ว่าเป็น true, false หรือ null
    is_external_type: typeof rawBot?.is_external, // เช็คว่าเป็น boolean หรือ string
    full_data: rawBot,
    db_error: rawError ? rawError.message : "None"
  });
}