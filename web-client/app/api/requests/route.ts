import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, requestType } = await req.json();

    if (!botId || !requestType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // -----------------------------------------------------------
    // คำนวณค่า Boolean จาก requestType ก่อนบันทึก
    // -----------------------------------------------------------
    const isPublic = requestType === "publish" || requestType === "both";
    const isExternal = requestType === "share" || requestType === "both";

    // เช็คก่อนว่ามี Request ที่ Pending อยู่แล้วไหม?
    const { data: existingRequest } = await supabaseAdmin
      .from("bot_requests")
      .select("id")
      .eq("bot_id", botId)
      .eq("status", "pending")
      .single();

    let error;

    if (existingRequest) {
      // 🔄 กรณีมีอยู่แล้ว: ให้ UPDATE type และค่า Boolean ใหม่
      const { error: updateError } = await supabaseAdmin
        .from("bot_requests")
        .update({
          request_type: requestType,
          requested_is_public: isPublic,
          requested_is_external: isExternal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRequest.id);

      error = updateError;
    } else {
      // ➕ กรณีไม่มี: ให้ INSERT ใหม่พร้อมค่า Boolean
      const { error: insertError } = await supabaseAdmin
        .from("bot_requests")
        .insert({
          bot_id: botId,
          requester_email: session.user.email,
          request_type: requestType,
          requested_is_public: isPublic,
          requested_is_external: isExternal,
          status: "pending",
        });

      error = insertError;
    }

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Request API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = await req.json();

    if (!botId) {
      return NextResponse.json({ error: "Bot ID required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("bot_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("bot_id", botId)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cancel Request Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
