import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const session = await auth();
    // เช็ค Role Admin (ถ้าต้องการข้ามการเช็คชั่วคราวเพื่อเทส ให้ comment บรรทัดข้างล่างนี้)
    const userRole = (session?.user as any)?.role;
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching requests...");

    // ดึงแบบ Join (Standard)
    // ถ้า Foreign Key ชื่อ bot_id ตรงกัน Supabase มักจะฉลาดพอ
    const { data, error } = await supabaseAdmin
      .from("bot_requests")
      .select(
        `
        id,
        bot_id,
        requester_email,
        request_type,
        requested_is_public,
        requested_is_external,
        status,
        created_at,
        bots:bots!bot_requests_bot_id_fkey ( 
          name,
          description,
          owner_id
        )
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // ⚠️ ถ้า Error: "Could not find a relationship between..."
    // ให้ลองเปลี่ยน bots!inner เป็น bots!bot_requests_bot_id_fkey (ชื่อ FK จริงใน DB)

    if (error) {
      console.error("❌ Admin Request Fetch Error:", error);
      throw error;
    }

    console.log(`✅ Found ${data.length} pending requests`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Method สำหรับรับการ Approve / Reject
export async function PUT(req: Request) {
  try {
    const session = await auth();
    // (เช็ค Role Admin)
    const userRole = (session?.user as any)?.role;
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, status, adminNote } = await req.json();

    if (!requestId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. ดึงข้อมูล Request ปัจจุบันออกมาก่อน
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from("bot_requests")
      .select("bot_id, request_type")
      .eq("id", requestId)
      .single();

    if (fetchError || !requestData) {
      throw new Error("Request not found");
    }

    const { bot_id, request_type } = requestData;

    // ✅ 2. LOGIC อนุมัติ: อัปเดตตาราง bots
    if (status === "approved") {
      // เตรียม Payload เริ่มต้น (เคลียร์สถานะ pending ทิ้งด้วยเมื่ออนุมัติแล้ว)
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      // กำหนดค่า is_public / is_external ตามประเภทคำร้อง
      if (request_type === "publish") {
        updatePayload.is_public = true;
      } else if (request_type === "share") {
        updatePayload.is_external = true;
      } else if (request_type === "both") {
        updatePayload.is_public = true;
        updatePayload.is_external = true;
      }

      // 🌟 เพิ่ม LOGIC: สร้าง Share Token ถ้าเปิด External แล้วยังไม่มี Token
      if (updatePayload.is_external) {
        // เช็คก่อนว่ามี token เดิมไหม
        const { data: currentBot } = await supabaseAdmin
          .from("bots")
          .select("share_token")
          .eq("bot_id", bot_id)
          .single();

        // ถ้าไม่มี ให้สร้างใหม่เลย
        if (!currentBot?.share_token) {
          updatePayload.share_token = crypto.randomUUID();
        }
      }

      // อัปเดตตาราง bots จริงๆ
      const { error: botUpdateError } = await supabaseAdmin
        .from("bots")
        .update(updatePayload)
        .eq("bot_id", bot_id);

      if (botUpdateError) throw botUpdateError;
    } else if (status === "rejected") {
      // (Optional) ถ้าปฏิเสธ ก็ควรปลดสถานะ Pending ออกเพื่อให้ User แก้ไขใหม่ได้
      await supabaseAdmin
        .from("bots")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("bot_id", bot_id);
    }

    // 3. อัปเดตสถานะในตาราง bot_requests (เปลี่ยนเป็น approved/rejected)
    const { error: updateError } = await supabaseAdmin
      .from("bot_requests")
      .update({
        status: status,
        admin_note: adminNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Action Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
