import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const session = await auth();
    // (ควรเช็ค Role Admin ตรงนี้)
    
    const { botId } = await params;

    if (!botId) {
      return NextResponse.json({ error: "Bot ID required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("bots")
      .select("*") // ดึงทุก field รวมถึง system_instruction, temperature
      .eq("bot_id", botId)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}