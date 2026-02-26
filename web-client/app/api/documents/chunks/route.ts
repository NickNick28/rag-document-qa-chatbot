import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Init Supabase Admin (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    // 1. Check User Session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Params
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const botId = searchParams.get("botId");

    if (!documentId || !botId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // 3. Security Check: User เป็นเจ้าของ Bot นี้จริงหรือไม่?
    const { data: botCheck } = await supabaseAdmin
      .from("bots")
      .select("owner_id")
      .eq("bot_id", botId)
      .single();

    if (!botCheck || botCheck.owner_id !== session.user.email) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // 4. Query Chunks
    const { data: chunks, error } = await supabaseAdmin
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId) // ดึงเฉพาะของไฟล์นี้
      .order("chunk_index", { ascending: true }); // เรียงตามลำดับเนื้อหา

    if (error) {
      throw error;
    }

    return NextResponse.json({ chunks });

  } catch (error: any) {
    console.error("Fetch chunks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}