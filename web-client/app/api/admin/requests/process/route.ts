import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, action, adminNote } = await req.json(); // action: 'approve' | 'reject'

    // 1. ดึงข้อมูล Request มาก่อน
    const { data: request, error: fetchError } = await supabaseAdmin
      .from("bot_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "approve") {
      // ✅ ถ้า Approve: อัปเดตตาราง bots ให้เป็นจริงตามที่ขอ
      const { error: updateBotError } = await supabaseAdmin
        .from("bots")
        .update({
          is_public: request.requested_is_public,
          is_external: request.requested_is_external,
          updated_at: new Date().toISOString(),
        })
        .eq("bot_id", request.bot_id);

      if (updateBotError) throw updateBotError;

      // อัปเดตสถานะ Request เป็น approved
      await supabaseAdmin
        .from("bot_requests")
        .update({ status: "approved", admin_note: adminNote })
        .eq("id", requestId);

    } else if (action === "reject") {
      // ❌ ถ้า Reject: แค่อัปเดตสถานะ Request (ค่าใน bots ไม่เปลี่ยน)
      await supabaseAdmin
        .from("bot_requests")
        .update({ status: "rejected", admin_note: adminNote })
        .eq("id", requestId);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}