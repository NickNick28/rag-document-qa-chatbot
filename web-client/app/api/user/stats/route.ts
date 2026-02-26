import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { ROLE_LIMITS } from "@/app/lib/token-service"; // Import Limits

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userRole = (session.user as any).role || 'user';

    // 1. Get Token Usage
    const { data: usageData } = await supabaseAdmin
      .from('user_usage')
      .select('tokens_used')
      .eq('user_email', userEmail)
      .single();

    // 2. Get Messages Count (เหมือนเดิม)
    const { count: messageCount } = await supabaseAdmin
      .from("chat_history")
      .select("*", { count: "exact", head: true }) 
      .ilike("session_id", `${userEmail}%`);

    // 3. Get Bot Count (เหมือนเดิม)
    const { count: botCount } = await supabaseAdmin
      .from("bots")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userEmail);

    return NextResponse.json({
      totalMessages: messageCount || 0,
      totalBots: botCount || 0,
      // ✅ ส่งค่า Token กลับไป
      tokensUsed: usageData?.tokens_used || 0,
      maxTokens: ROLE_LIMITS[userRole] || ROLE_LIMITS['user']
    });

  } catch (error: any) {
    console.error("Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}