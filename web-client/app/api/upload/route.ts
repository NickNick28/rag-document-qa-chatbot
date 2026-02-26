import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getMcpClient } from "@/app/lib/mcp-client";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Admin Client เพื่อ Bypass RLS ตอน Insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // Check Auth
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;
    const url = new URL(req.url);
    const botId = url.searchParams.get("botId");

    if (!file || !botId) {
      return NextResponse.json(
        { error: "Missing file or botId" },
        { status: 400 }
      );
    }

    // Verify Ownership Check
    const { data: botCheck } = await supabaseAdmin // ✅ ใช้ Admin เช็คเพื่อความชัวร์
      .from("bots")
      .select("id, owner_id") // ดึง owner_id มาเทียบ
      .eq("bot_id", botId)
      .single();

    // เช็คว่ามีบอท และ Owner ตรงกับคน Login
    if (!botCheck || botCheck.owner_id !== userEmail) {
      return NextResponse.json(
        { error: "Access Denied: You do not own this bot." },
        { status: 403 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save File logic
    const documentsDir = path.join(
      process.cwd(),
      "../mcp-server-python/documents"
    );
    
    // สร้าง folder หากยังไม่มี
    await mkdir(documentsDir, { recursive: true });
    
    // สร้าง path ไฟล์
    const filePath = path.join(documentsDir, file.name);
    console.log(`📂 Saving file to: ${filePath}`);
    
    // เขียนไฟล์ลง Disk
    await writeFile(filePath, buffer);
    console.log(`✅ File saved to: ${filePath}`);

    // ==========================================
    // ✅ 3. ส่วนที่เพิ่มใหม่: บันทึกลง Database
    // ==========================================
    const { error: dbError } = await supabaseAdmin
      .from("documents")
      .insert([
        {
          bot_id: botId,
          filename: file.name,
          // created_at จะ auto gen เองตาม Default value
        }
      ]);

    if (dbError) {
      console.error("❌ Failed to insert document record:", dbError);
      // เลือกเอาว่าจะให้หยุดทำงานไหม ถ้าหยุดก็ return error
      return NextResponse.json({ error: "Database Error: " + dbError.message }, { status: 500 });
    }
    console.log(`📝 Document record created in DB: ${file.name}`);

    // --- เรียก MCP แบบ Singleton ---
    const client = await getMcpClient();

    // เรียก Tool
    await client.callTool({
      name: "add_pdf_to_knowledge_base",
      arguments: {
        filename_or_path: file.name,
        bot_id: botId || "general",
      },
    });

    return NextResponse.json({ success: true, message: "Upload triggered and recorded" });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
  }
}