//ทำงานใน Setting Modal หน้า ChatPage
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth"; // ⚠️ ตรวจสอบว่า path นี้ถูกต้องในโปรเจกต์คุณ
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export async function POST(req: Request) {
  console.log("🚀 API /api/bots/update Hit!"); // 1. เช็กว่าเรียก API ถูก URL ไหม

  try {
    // 1. ตรวจสอบ Session
    const session = await auth();
    console.log("👤 User Session:", session?.user?.email);

    if (!session || !session.user?.email) {
      console.error("❌ Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. รับข้อมูล Body
    const body = await req.json();
    console.log("📦 Received Body:", body);

    const { botId, name, description, is_public, is_external } = body;

    if (!botId) {
      console.error("❌ Missing botId");
      return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    }

    // 3. ตรวจสอบความเป็นเจ้าของ (ใช้ supabaseAdmin เพื่อความชัวร์ แต่ใส่เงื่อนไขให้ครบ)
    console.log("🔍 Checking ownership for bot:", botId);
    const { data: botCheck, error: checkError } = await supabaseAdmin
      .from("bots")
      .select("id")
      .eq("bot_id", botId)
      .eq("owner_id", session.user.email)
      .single();

    if (checkError || !botCheck) {
      console.error("❌ Ownership check failed:", checkError);
      return NextResponse.json(
        { error: "Access Denied: You do not own this bot." },
        { status: 403 }
      );
    }

    // 4. อัปเดตข้อมูล (ใช้ supabaseAdmin bypass RLS)
    console.log("💾 Updating database...");
    const { error: updateError } = await supabaseAdmin
      .from("bots")
      .update({
        name: name,
        description: description,
        is_public: is_public,
        is_external: is_external,
        updated_at: new Date().toISOString(),
      })
      .eq("bot_id", botId)
      .eq("owner_id", session.user.email); // ✅ เพิ่ม owner_id เพื่อความปลอดภัยสูงสุด (ถึงแม้จะเช็คไปแล้ว)

    if (updateError) {
      console.error("❌ Supabase Update Error:", updateError.message);
      // 🔥 สาเหตุยอดฮิต: ไม่มี column name/description ใน DB
      return NextResponse.json({ error: "Database Error: " + updateError.message }, { status: 500 });
    }

    console.log("✅ Update Success!");
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("💥 Critical Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}