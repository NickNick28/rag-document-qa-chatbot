import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js"; // ใช้ Admin Client
import { getMcpClient } from "@/app/lib/mcp-client"; // ถ้าต้องลบ Vector ผ่าน MCP

export const dynamic = "force-dynamic";

// ✅ ใช้ Admin Client เพื่อจัดการข้อมูล (Bypass RLS ที่เราตั้งไว้ให้มันยุ่งยาก)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. GET: ดึงรายชื่อเอกสาร
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("botId");

  if (!botId)
    return NextResponse.json({ error: "Missing botId" }, { status: 400 });

  // ✅ Security Check: ตรวจสอบก่อนว่า User เป็นเจ้าของบอทนี้ไหม?
  const { data: botCheck } = await supabaseAdmin
    .from("bots")
    .select("owner_id")
    .eq("bot_id", botId)
    .single();

  if (!botCheck || botCheck.owner_id !== session.user.email) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  // ถ้าเป็นเจ้าของจริง ให้ดึงเอกสาร
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// 2. DELETE: ลบเอกสาร
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, botId, filename } = await req.json();

  // ✅ Security Check: ตรวจสอบว่า User เป็นเจ้าของบอทที่จะลบไฟล์ไหม?
  // (ป้องกันการยิง API มั่วๆ มาลบไฟล์คนอื่น)
  const { data: botCheck } = await supabaseAdmin
    .from("bots")
    .select("owner_id")
    .eq("bot_id", botId)
    .single();

  if (!botCheck || botCheck.owner_id !== session.user.email) {
    return NextResponse.json(
      { error: "Access Denied: You do not own this bot" },
      { status: 403 }
    );
  }

  // ลบ Record จาก Database
  const { error } = await supabaseAdmin.from("documents").delete().eq("id", id); // ลบด้วย ID ของ Document

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const client = await getMcpClient();
    await client.callTool({
      name: "delete_document", // ชื่อต้องตรงกับใน Python
      arguments: {
        bot_id: botId,
        filename: filename,
      },
    });
    console.log(`✅ Vector deleted for: ${filename}`);
  } catch (err) {
    console.error("⚠️ Failed to delete vector:", err);
    // ไม่ต้อง return error เพราะถือว่าลบใน DB สำเร็จแล้ว (User ไม่เห็นไฟล์แล้ว)
    // แต่อาจจะเก็บ Log ไว้ตรวจสอบภายหลัง
  }

  return NextResponse.json({ success: true });
}
