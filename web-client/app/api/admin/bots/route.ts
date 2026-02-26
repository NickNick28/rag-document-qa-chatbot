import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/app/lib/auth"; // หรือ path ที่คุณเก็บ auth config
import { getMcpClient } from "@/app/lib/mcp-client";

// ใช้ Service Role Key เพื่อทะลุ RLS (ระวังเรื่อง Security ต้องเช็ค Role เสมอ)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    // 1. Check Session & Role
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Query All Bots
    // Join กับตาราง users (หรือใช้ owner_id) เพื่อให้รู้ว่าใครเป็นเจ้าของ
    // เนื่องจาก Supabase Auth User ไม่ได้อยู่ใน public schema ตรงๆ
    // เราจะดึง owner_id มาโชว์เลย หรือถ้าคุณมีตาราง public.users ก็ join ได้

    const { data: bots, error } = await supabaseAdmin
      .from("bots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(bots);
  } catch (error: any) {
    console.error("Fetch All Bots Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Optional: เพิ่ม DELETE เพื่อให้ Admin ลบบอทใครก็ได้
export async function DELETE(req: Request) {
  try {
    // 1. ตรวจสอบสิทธิ์ Admin
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. รับค่า botId
    const body = await req.json();
    const { botId } = body;

    if (!botId) {
      return NextResponse.json({ error: "Missing botId" }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // ลบข้อมูลจาก Supabase (Database)
    // ------------------------------------------------------------------
    const { error, count } = await supabaseAdmin
      .from("bots")
      .delete({ count: "exact" })
      .eq("bot_id", botId); // ⚠️ Admin ลบได้เลย ไม่ต้องเช็ค owner_id

    if (error) {
      console.error("Supabase Delete Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ถ้าลบแล้วไม่เจอข้อมูล (อาจจะลบไปแล้ว หรือ id ผิด)
    if (count === 0) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // ลบข้อมูลจาก Pinecone ผ่าน MCP (Vector Database)
    // ------------------------------------------------------------------
    // เราทำแยกใน try-catch เพื่อไม่ให้กระทบกับ Response หลักถ้า MCP มีปัญหา
    try {
      console.log(`🧹 Cleaning up vectors for bot: ${botId}...`);

      const client = await getMcpClient();
      const tools = await client.listTools();

      // เช็คว่ามี Tool ชื่อ delete_bot ไหม
      const hasDeleteTool = tools.tools.some((t) => t.name === "delete_bot");

      if (hasDeleteTool) {
        await client.callTool({
          name: "delete_bot",
          arguments: { bot_id: botId },
        });
        console.log("✅ MCP cleanup successful");
      } else {
        console.warn("⚠️ Tool 'delete_bot' not found in MCP Server");
      }
    } catch (mcpError) {
      // แค่ Log เตือน แต่ไม่ต้อง return error เพราะใน DB ลบไปแล้ว
      console.error(
        "⚠️ Warning: Failed to cleanup Pinecone via MCP:",
        mcpError,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
