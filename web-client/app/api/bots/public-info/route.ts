import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // ✅ รับค่า token แทน botId

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // ✅ ค้นหาด้วย share_token และต้อง is_external = true
  const { data, error } = await supabaseAdmin
    .from("bots")
    .select("bot_id, name, description, recommend_chat, is_external")
    .eq("share_token", token)
    .eq("is_external", true) 
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Bot not found or link expired" }, { status: 404 });
  }

  return NextResponse.json(data);
}