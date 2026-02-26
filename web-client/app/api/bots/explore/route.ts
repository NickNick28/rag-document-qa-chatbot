import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ป้องกันการ cache ข้อมูลเก่า (เพื่อให้เห็นบอทใหม่ทันที)
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // ดึงเฉพาะบอทที่ is_public = true
    const { data, error } = await supabaseAdmin
      .from("bots")
      .select("bot_id, name, description, owner_id, created_at, updated_at")
      .eq("is_public", true)
      .order("created_at, updated_at", { ascending: false }); // เรียงจากใหม่ไปเก่า

    if (error) throw error;

    return NextResponse.json({ bots: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}